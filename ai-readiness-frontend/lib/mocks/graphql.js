// Temporary mock for graphql module
export const GraphQLError = class GraphQLError extends Error {
  constructor(message) {
    super(message);
    this.name = 'GraphQLError';
  }
};

export const GraphQLObjectType = class {};
export const GraphQLSchema = class {};
export const GraphQLString = {};
export const GraphQLInt = {};
export const GraphQLFloat = {};
export const GraphQLBoolean = {};
export const GraphQLID = {};

export default {
  GraphQLError,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
  GraphQLInt,
  GraphQLFloat,
  GraphQLBoolean,
  GraphQLID
};