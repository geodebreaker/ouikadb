const VERSION = require('./package.json')?.version || '1.0.0';
const fs = require('fs');
const Path = require('path');

class OuikaError extends Error {
  constructor(message) {
    super(message);
    this.name = 'OuikaError';
  }
}

class ouika {
  constructor(path, name, overwrite) {
    make(path, name, overwrite)
    this._path = Path.join(path, name + '.db');
    this._name = name;

    let lastusedPath = Path.join(this._path, '.lastused');

    if (!fs.existsSync(this._path)) mkerror(this, 'db does not exist');
    try {
      fs.accessSync(this._path, fs.constants.R_OK | fs.constants.W_OK);
    } catch (e) {

      mkerror(this, 'db does not have sufficient permissions');
    }
    if (fs.existsSync(lastusedPath) && fs.readFileSync(lastusedPath) > Date.now())
      mkerror(this, 'db in use');

    this.schema = JSON.parse(fs.readFileSync(Path.join(this._path, '.schema')).toString());
    let schemaVerDiff = this.schema.version.split('.').map((x, i) =>
      parseInt(VERSION.split('.')[i]) - parseInt(x));
    for (let i = 0; i < schemaVerDiff.length; i++) {
      if (schemaVerDiff[i] < 0) mkerror(this, 'schema version newer, please update');
      if (schemaVerDiff[i] > 0) break;
    }
    try {
      this.db = new node(this, 'db', this._path, null, this.schema.structure);
    } catch (e) {
      this.db = new node(this, 'db', this._path, null, this.schema.structure);
    }

    fs.writeFileSync(lastusedPath, (Date.now() + 60e3).toString())
    this._interval = setInterval(x => {
      fs.writeFileSync(lastusedPath, (Date.now() + 60e3).toString())
    }, 59e3);

    process.on('SIGINT', () => this.close(this));
    process.on('SIGTERM', () => this.close(this));
    process.on('beforeExit', () => this.close(this));
  }

  close(x) {
    clearInterval(x._interval);
    if (fs.existsSync(Path.join(x._path, '.lastused')))
      fs.unlinkSync(Path.join(x._path, '.lastused'));
    delete this;
  }

  _update() {
    this.schema.structure = Object.fromEntries(this.db.children.map(x => x._buildStructure()));
    fs.writeFileSync(Path.join(this._path, '.schema'), JSON.stringify(this.schema));
  }

  _fix(path) {
    if (!path) {
      path = Path.join(this._path, 'db');
    }
    if (fs.statSync(path).isFile())
      return null;
    else
      return Object.fromEntries(fs.readdirSync(path).map(x =>
        [x, this._fix(Path.join(path, x))]));
  }
}

class node {
  constructor(top, name, path, parent, children) {
    this.path = Path.join(path, name);
    if (!fs.existsSync(this.path)) {
      mkerror(top, 'db mismatch error', true);
      top.schema.structure = top._fix();
      mkerror(top, 'db mismatch fixed', true);
      throw new Error();
    }
    this.isnode = true;
    this.name = name.toString().replace(/\.\./g, '');
    this.top = top;
    this.parent = parent;
    this.leaf = !children;
    this._cachedValue = undefined;
    if (!this.leaf)
      this.children = Object.entries(children).map(x =>
        x[1]?.isnode ? x[1] : new node(top, x[0], this.path, this, x[1]));
  }

  findIndex(name) {
    if (this.leaf) return -1;
    return this.children.findIndex(x => x.name == name)
  }

  find(name) {
    let i = this.findIndex(name);
    if (i == -1) return undefined;
    return this.children[i];
  }

  add(name, value = null, raw) {
    if (this.findIndex(name) != -1) return this.find(name);
    if (value !== null)
      fs.writeFileSync(Path.join(this.path, name), raw ? value : value.toString());
    else if (!fs.existsSync(Path.join(this.path, name)))
      fs.mkdirSync(Path.join(this.path, name))
    let x = new node(this.top, name, this.path, this, value !== null ? undefined : {});
    this.children.push(x);
    this.top._update();
    return x;
  }

  remove(name = false) {
    if (!name) {
      if (!this.parent) return false;
      this.parent.children.splice(
        this.parent.findIndex(this.name), 1);
      fs.rmSync(this.path, { recursive: true });
    } else {
      this.find(name).remove();
    }
    this.top._update();
    return true;
  }

  get value() {
    if (!this.leaf) return undefined;
    if (!this._cachedValue) this._cachedValue = fs.readFileSync(this.path);
    return this._cachedValue.toString();
  }

  get valueRaw() {
    if (!this.leaf) return undefined;
    if (!this._cachedValue) this._cachedValue = fs.readFileSync(this.path);
    return this._cachedValue;
  }

  set value(x) {
    if (!this.leaf) return;
    this._cachedValue = x.toString();
    fs.writeFileSync(this.path, x.toString());
  }

  set valueRaw(x) {
    if (!this.leaf) return;
    this._cachedValue = x;
    fs.writeFileSync(this.path, x);
  }

  _buildStructure() {
    if (this.leaf) {
      return [this.name, null];
    } else {
      return [this.name, Object.fromEntries(this.children.map(x => x._buildStructure()))];
    }
  }
}

function make(path, name, overwrite) {
  let schema = {
    structure: {},
    version: VERSION
  };

  let dbpath = Path.join(path, name + '.db');
  let dbpathExists = fs.existsSync(dbpath);

  if (dbpathExists && overwrite && path) {
    fs.rmSync(dbpath, { recursive: true });
    dbpathExists = false;
  }

  if (!dbpathExists) {
    fs.mkdirSync(dbpath);
    fs.mkdirSync(Path.join(dbpath, 'db'));
    fs.writeFileSync(Path.join(dbpath, '.schema'), JSON.stringify(schema));
    fs.writeFileSync(Path.join(dbpath, '.log'), '');
  }

  fs.accessSync(dbpath, fs.constants.R_OK | fs.constants.W_OK);
}

function mkerror(h, x, n) {
  fs.appendFileSync(Path.join(h._path, '.log'), Date().replace(/ GMT.*$/, '') + ': ' + x + '\n');
  console.error('Ouika Error:', x);
  if (!n) {
    h.close(h);
    throw new OuikaError(x);
  }
}

// ouika.make = make;
module.exports = ouika;