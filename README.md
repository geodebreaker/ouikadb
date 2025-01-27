# Ouika DB

```js
// -- BEFORE --
// dbname.db/
// ├── .log
// ├── .schema
// └── db/
//     ├── abc/
//     └── xyz/
//         └── 123/

const ouika = require('ouikadb');
const handle = new ouika('path/to/db', 'dbname'); // Will create new DB if one is not found

// Create & Remove files & folders
let folder = handle.db.add('folder'); // Create a folder within the DB
folder.add('file1', 'foo'); // Create a file within the folder
folder.remove('file1'); // Delete the folder

// Store references to files & folders as variables
let file2 = folder.add('file2', 'bar'); // Create another file within the folder and store it
console.log(file2 == folder.find('file2')); // true

// Get & Set values 
console.log(file2.value); // bar
file2.value = 10; // Ouika will save changes in the filesystem
console.log(file2.value); // 10

// Navigate and modify DB 
handle.db.find('abc').remove();
handle.db.find('xyz').find('123').add('flabbergasted', '100'); 

handle.close(); // Close the handle to the DB

// -- AFTER --
// dbname.db/
// ├── .log
// ├── .schema
// └── db/
//     ├── folder/
//     │   └── file2
//     └── xyz/
//         └── 123/
//             └── flabbergasted
```

### 

```js
const ouika = require('ouikadb'); // this
import ouikadb as ouika // or this

new ouika('path/to/db', 'dbname'); 
// ^ Creates a handle to a DB, will create a DB if it does not exist

handle.db > node // Root folder
handle.close() > null // Close handle

// Files and folders are nodes

// Structure
node.add('name', 'value') > node // Create file within node, outputs created file
node.add('name') > node // Create folder within node, outputs created folder
node.remove() > bool // Remove node from parent, outputs success
node.remove('name') > bool // Remove child node named 'name', outputs success
node.find('name') > node // Find child node named 'name', outputs child node
node.children[] > node // List of child nodes
node.parent > node // Parent node 
node.findIndex() > number // Find child node named 'name', outputs index of child node in node.children

// Value
get node.value > string // Returns value of file acociated with node, if folder, returns undefined
get node.valueRaw > any // ^
get node.value < string // Changes value of file acociated with node, if folder, does nothing
get node.valueRaw < any // ^

// Other
node.name > string // Name of node
node.top > handle // Handle of DB node is from
node.path > string // Path of file according to node
node.leaf > bool // Returns true if node is a file
node.isnode > true
```