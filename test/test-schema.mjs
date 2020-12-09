import {Schema} from "../index.mjs";
import expect from "expect.js";

describe("new Schema()", () => {
    let schema = null;

    beforeEach(() => {
        schema = new Schema();
    });

    it("should initialize Schema with 0 definitions", () => {
        const definitions = Array.from(schema.definitions());
        expect(definitions.length).to.be(0);
    });
});

describe("Schema.envName(string)", () => {
    it("should capitalize letters", () => {
        expect(Schema.envName("foo")).to.be("FOO");
    });

    it("should preserve underscores", () => {
        expect(Schema.envName("foo_bar")).to.be("FOO_BAR");
    });

    it("should replace spaces with underscores", () => {
        expect(Schema.envName("foo bar baz")).to.be("FOO_BAR_BAZ");
    });

    it("should replace hyphens with underscores", () => {
        expect(Schema.envName("foo-bar-baz")).to.be("FOO_BAR_BAZ");
    });
});

describe("Schema.optName(string)", () => {
    it("should add '--' prefix", () => {
        expect(Schema.optName("foo")).to.be("--foo");
    });

    it("should lowercase letters", () => {
        expect(Schema.optName("FOO")).to.be("--foo");
    });

    it("should preserve hyphens", () => {
        expect(Schema.optName("foo-bar")).to.be("--foo-bar");
    });

    it("should replace spaces with hyphens", () => {
        expect(Schema.optName("foo bar baz")).to.be("--foo-bar-baz");
    });

    it("should replace underscores with hyphens", () => {
        expect(Schema.optName("foo_bar_baz")).to.be("--foo-bar-baz");
    });
});

describe("Schema#define(string, ...symbol)", () => {
    const name = "foo";
    const flags = [Symbol(), Symbol()];

    let schema = null;

    beforeEach(() => {
        schema = new Schema();
        schema.define(name, ...flags);
    });

    it("should add definition to schema", () => {
        // NOTE: the .defs property is private and should not be used
        expect(schema.defs).to.be.a(Map);
        expect(schema.defs.has(name)).to.be(true);
    });

    it("should associate flags with definition", () => {
        expect(schema.defs.get(name)).to.be.a(Set);
        expect(schema.defs.get(name).size).to.be(flags.length);
        expect(schema.defs.get(name).has(flags[0])).to.be(true);
        expect(schema.defs.get(name).has(flags[1])).to.be(true);
    });
});

describe("Schema#definitions()", () => {
    const defs = {foo: [Schema.Flag], bar: [Schema.Required, Schema.Multi]};

    let schema = null;

    beforeEach(() => {
        schema = new Schema();
        for (const name in defs) schema.define(name, ...defs[name]);
    });

    it("should iterate over definitions", () => {
        const def = {};

        for (const {name, flags} of schema.definitions()) {
            expect(name in defs).to.be(true);
            def[name] = [...flags];
        }

        expect(def.foo).to.be.an("array");
        expect(def.foo.length).to.be(1);
        expect(def.foo.includes(Schema.Flag)).to.be(true);

        expect(def.bar).to.be.an("array");
        expect(def.bar.length).to.be(2);
        expect(def.bar.includes(Schema.Required)).to.be(true);
        expect(def.bar.includes(Schema.Multi)).to.be(true);
    });
});

describe("Schema#read(object, string[], [object])", () => {
    let schema = null;

    beforeEach(() => {
        schema = new Schema();
        schema.define("simple value");
    });

    it("should create default config object if not passed", () => {
        const config = schema.read({}, []);
        expect(config).to.be.an("object");
    });

    it("should return config object if passed", () => {
        const initialConfig = {};
        const config = schema.read({}, [], initialConfig);
        expect(config).to.be(initialConfig);
    });

    it("should preserve values from initial config", () => {
        const initialConfig = {foo: 13};
        const config = schema.read({}, [], initialConfig);
        expect(config.foo).to.be(13);
    });

    it("should map environment variable to config", () => {
        const env = {SIMPLE_VALUE: "foo"};
        expect(schema.read(env, [])["simple value"]).to.be("foo");
    });

    it("should map option to config", () => {
        const argv = ["--simple-value", "foo"];
        expect(schema.read({}, argv)["simple value"]).to.be("foo");
    });

    it("should handle option with delimited value", () => {
        const argv = ["--simple-value=foo"];
        expect(schema.read({}, argv)["simple value"]).to.be("foo");
    });

    it("should prefer: option > environment var > initial value", () => {
        const env = {SIMPLE_VALUE: "env"};
        const argv = ["--simple-value", "opt"];

        expect(schema.read({}, [], {"simple value": "init"})["simple value"]).to.be("init");
        expect(schema.read(env, [], {"simple value": "init"})["simple value"]).to.be("env");
        expect(schema.read({}, argv, {"simple value": "init"})["simple value"]).to.be("opt");
        expect(schema.read(env, argv, {"simple value": "init"})["simple value"]).to.be("opt");
    });
});

describe("Schema.Flag", () => {
    let schema = null;

    beforeEach(() => {
        schema = new Schema();
        schema.define("flag", Schema.Flag);
    });

    it("should be a symbol", () => {
        expect(Schema.Flag).to.be.a("symbol");
    });

    describe("when used in field definition", () => {
        it("should map missing environment/option to undefined", () => {
            expect(schema.read({}, []).flag).to.be(undefined);
        });

        it("should map empty environment to false", () => {
            expect(schema.read({FLAG: ""}, []).flag).to.be(false);
        });

        it("should map non-empty environment to true", () => {
            expect(schema.read({FLAG: "enable"}, []).flag).to.be(true);
        });

        it("should map to true when option is present", () => {
            expect(schema.read({}, ["--flag"]).flag).to.be(true);
        });
    });
});

describe("Schema.Required", () => {
    let schema = null;

    beforeEach(() => {
        schema = new Schema();
        schema.define("required", Schema.Required);
    });

    it("should be a symbol", () => {
        expect(Schema.Required).to.be.a("symbol");
    });

    describe("when used in field definition", () => {
        it("should throw on missing environment/option", () => {
            expect(() => schema.read({}, [])).to.throwError();
        });

        it("should accept empty environment/option", () => {
            expect(schema.read({REQUIRED: ""}, ["--required="]).required).to.be("");
        });
    });
});

describe("Schema.Multi", () => {
    let schema = null;

    beforeEach(() => {
        schema = new Schema();
        schema.define("multi", Schema.Multi);
    });

    it("should be a symbol", () => {
        expect(Schema.Multi).to.be.a("symbol");
    });

    describe("when used in field definition", () => {
        it("should map missing environment/option to undefined", () => {
            expect(schema.read({}, []).multi).to.be(undefined);
        });

        it("should map environment to single-element array", () => {
            const value = schema.read({MULTI: "foo"}, []).multi;
            expect(value).to.be.an("array");
            expect(value.length).to.be(1);
            expect(value[0]).to.be("foo");
        });

        it("should map options to ordered array values", () => {
            const value = schema.read({}, ["--multi=foo", "--multi=bar"]).multi;
            expect(value).to.be.an("array");
            expect(JSON.stringify(value)).to.be(JSON.stringify(["foo", "bar"]));
        });

        it("should accept empty environment/option", () => {
            const value = schema.read({MULTI: ""}, []).multi;
            expect(value).to.be.an("array");
            expect(JSON.stringify(value)).to.be(JSON.stringify([""]));
        });
    });
});

describe("using multiple field definition flags", () => {
    describe("Flag + Multi", () => {
        let schema = null;

        beforeEach(() => {
            schema = new Schema();
            schema.define("multi_flag", Schema.Flag, Schema.Multi);
        });

        it("should map missing environment/option to undefined", () => {
            expect(schema.read({}, []).multi_flag).to.be(undefined);
        });

        it("should count the number of times flag is used", () => {
            expect(schema.read({MULTI_FLAG: "enable"}, []).multi_flag).to.be(1);
            expect(schema.read({}, ["--multi-flag", "--multi-flag"]).multi_flag).to.be(2);
            expect(schema.read({MULTI_FLAG: "enable"}, ["--multi-flag"]).multi_flag).to.be(1);
        });
    });

    describe("Flag + Required", () => {
        let schema = null;

        beforeEach(() => {
            schema = new Schema();
            schema.define("required_flag", Schema.Flag, Schema.Required);
        });

        it("should map missing environment/option to false", () => {
            expect(schema.read({}, []).required_flag).to.be(false);
        });
    });

    describe("Multi + Required", () => {
        let schema = null;

        beforeEach(() => {
            schema = new Schema();
            schema.define("multi_required", Schema.Multi, Schema.Required);
        });

        it("should throw on missing environment/option", () => {
            expect(() => schema.read({}, [])).to.throwError();
        });

        it("should accept empty environment/option", () => {
            const value = schema.read({MULTI_REQUIRED: ""}, ["--multi-required="]).multi_required;
            expect(JSON.stringify(value)).to.be(JSON.stringify([""]));
        });
    });

    describe("Flag + Multi + Required", () => {
        let schema = null;

        beforeEach(() => {
            schema = new Schema();
            schema.define("required_multi_flag", Schema.Flag, Schema.Multi, Schema.Required);
        });

        it("should count the number of times flag is used", () => {
            expect(schema.read({}, []).required_multi_flag).to.be(0);
            expect(schema.read({REQUIRED_MULTI_FLAG: "enable"}, []).required_multi_flag).to.be(1);
            expect(schema.read({}, ["--required-multi-flag", "--required-multi-flag"]).required_multi_flag).to.be(2);
            expect(schema.read({REQUIRED_MULTI_FLAG: "enable"}, ["--required-multi-flag"]).required_multi_flag).to.be(1);
        });
    });
});
