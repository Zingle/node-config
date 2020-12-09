export const Flag = Symbol();
export const Multi = Symbol();
export const Prompt = Symbol();
export const Required = Symbol();

/**
 * @enum
 */
export const SchemaFlag = {
    Flag: Flag,
    Multi: Multi,
    Required: Required
};

export class Schema {
    constructor() {
        this.defs = new Map();
    }

    static envName(name) {
        return name.replace(/[ -]/g, "_").toUpperCase();
    }

    static optName(name) {
        return `--${name.replace(/[ _]/g, "-").toLowerCase()}`;
    }

    define(name, ...flags) {
        this.defs.set(name, new Set(flags));
    }

    *definitions() {
        for (const [name, flags] of this.defs.entries()) {
            yield {name, flags};
        }
    }

    read(env, argv, config={}) {
        const defs = Array.from(this.definitions());

        readenv(defs, config, env);
        readargv(defs, config, argv);
        verify(defs, config);

        return config;
    }
}

Object.freeze(SchemaFlag);
Object.assign(Schema, SchemaFlag);

function readenv(defs, config, env) {
    for (const {name, flags} of defs) {
        const envName = Schema.envName(name);

        if (envName in env) {
            if (flags.has(Flag) && flags.has(Multi)) {
                config[name] = env[envName] ? 1 : 0;
            } else if (flags.has(Flag)) {
                config[name] = Boolean(env[envName]);
            } else if (flags.has(Multi)) {
                config[name] = [env[envName]];
            } else {
                config[name] = env[envName];
            }
        }
    }
}

function readargv(defs, config, argv) {
    argv = splitOpts(argv);

    for (const {name, flags} of defs) {
        const optName = Schema.optName(name);

        if (argv.includes(optName)) {
            let i = 0;

            if (flags.has(Flag) && flags.has(Multi)) {
                config[name] = 0;
            }

            if (flags.has(Multi) && flags.has(Required)) {
                config[name] = [];
            }

            while ((i = argv.indexOf(optName, i)) >= 0) {
                if (flags.has(Flag) && flags.has(Multi)) {
                    const [opt] = argv.splice(i, 1);
                    config[name]++;
                } else if (flags.has(Flag)) {
                    const [opt] = argv.splice(i, 1);
                    config[name] = true;
                } else if (flags.has(Multi)) {
                    const [opt, val] = argv.splice(i, 2);
                    config[name] = config[name] || [];
                    config[name].push(val);
                } else {
                    const [opt, val] = argv.splice(i, 2);
                    config[name] = val;
                }
            }
        }
    }

    config.argv = argv;
}

function splitOpts(argv) {
    return argv.slice().map(arg => {
        if (/^--.+=/.test(arg)) {
            const [opt, ...rest] = arg.split("=");
            return [opt, rest.join("=")];
        } else {
            return [arg];
        }
    }).reduce((argv, args) => {
        return [...argv, ...args];
    }, []);
}

function verify(defs, config) {
    for (const {name, flags} of defs) {
        if (flags.has(Required) && config[name] === undefined) {
            if (flags.has(Flag) && flags.has(Multi)) {
                config[name] = 0;
            } else if (flags.has(Flag)) {
                config[name] = false;
            } else {
                throw new SchemaFieldRequiredError(name);
            }
        }
    }
}

export class SchemaFieldRequiredError extends Error {
    constructor(name) {
        super(`missing required ${name}`);

        this.name = name;
        this.optName = Schema.optName(name);
        this.envName = Schema.envName(name);
    }
}
