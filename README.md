The Zingle node-config project provides a way to configure Node.js apps using
the environment and command-line arguments.

Basic Usage
===========

Create Schema
-------------
The Schema class is the entry point into the @zingle/config package.  Start by
creating a new instance.

```js
import {Schema} from "@zingle/config";
const schema = new Schema();
```

Define Fields
-------------
Use the schema to configure fields which can be set.  Fields can have one or
more flags which control their behavior.

```js
schema.define("output_file");
schema.define("force", Schema.Flag);
schema.define("input_file", Schema.Required);
```

Read Configuration
------------------
Once fields have been defined on the schema, use the `.read` method to read the
configuration from the environment and command-line.

```js
const config = schema.read(process.env, process.argv);
```

Handle Leftover Arguments
-------------------------
Remaining arguments can be found in the `.argv` property of the configuration.

```js
if (config.argv.length > 2) {   // first two are "node", and the script name
    throw new Error(`unexpected argument ${config.argv[2]}`);
}
```

Example
=======
```js
import fs from "fs";
import {Schema} from "@zingle/config";

const schema = new Schema();

schema.define("output_file");
schema.define("force", Schema.Flag);
schema.define("input_file", Schema.Required);

const config = schema.read(process.env, process.argv);
const input = fs.readFileSync(config.input_file);
const output = processInput(input, config.force);

if (config.output_file) {
    fs.writeFileSync(config.output_file, output);
} else {
    console.log(output);
}
```
