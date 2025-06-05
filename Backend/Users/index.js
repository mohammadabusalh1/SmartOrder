require('dotenv').config();
const express = require('express');
const { ApolloServer } = require('apollo-server-express');
const mongoose = require('mongoose');
const cors = require('cors');
const typeDefs = require('./graphql/typeDefs');
const resolvers = require('./graphql/resolvers');
const { authentication } = require('./middleware/authentication');

// Initialize express
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
const MONGODB_URI = process.env.MONGO_URL || 'mongodb://mongodb-service:27017/users';

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("MongoDB connected successfully"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Setup Apollo Server
async function startApolloServer() {
  const apolloServer = new ApolloServer({
    typeDefs,
    resolvers,
    /**
     * Add authentication to the GraphQL context. This function is called for each
     * incoming GraphQL request and injects the authenticated user into the
     * GraphQL context. The context is then passed to all resolvers as the first
     * argument.
     *
     * @param {Object} ctx - The context object containing the Express request
     * @param {Object} ctx.req - The Express request object
     * @param {string} ctx.req.headers.authorization - The authentication token
     * @returns {Object} - The context with the authenticated user
     */
    context: ({ req }) => {
      // Add authentication to the GraphQL context
      const token = req.headers.authorization || '';
      const user = authentication(token);
      return { user };
    },
  });

  await apolloServer.start();
  apolloServer.applyMiddleware({ app, path: '/graphql' });

  const PORT = process.env.PORT;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`GraphQL endpoint: http://localhost:${PORT}${apolloServer.graphqlPath}`);
  });
}

startApolloServer().catch(err => {
  console.error('Error starting server:', err);
}); 