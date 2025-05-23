const { GraphQLScalarType } = require('graphql');
const { Kind } = require('graphql/language');

const JSONScalar = new GraphQLScalarType({
    name: 'JSON',
    description: 'JSON custom scalar type',
    serialize(value) {
        return value;
    },
    parseValue(value) {
        return value;
    },
    parseLiteral(ast) {
        if (ast.kind === Kind.OBJECT) {
            return ast.value;
        }
        return null;
    },
});

module.exports = JSONScalar;