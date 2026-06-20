import { GraphQLScalarType, Kind } from "graphql";
import { Prisma } from "@prisma/client";

// accepts strings/numbers and gives back a Decimal we can pass to Prisma.

export const DecimalScalar = new GraphQLScalarType({
    name: "Decimal",
    description: "Decimal serialised as string for precision.",
    serialize: (v) => new Prisma.Decimal(v as string | number).toString(),
    parseValue: (v) => new Prisma.Decimal(v as string | number),
    parseLiteral: (ast) => {
        if (
            ast.kind === Kind.STRING ||
            ast.kind === Kind.INT ||
            ast.kind === Kind.FLOAT
        ) {
            return new Prisma.Decimal(ast.value);
        }
        throw new TypeError("Decimal must be a string or number");
    },
});
