require('dotenv').config();
const express = require('express');
const { ApolloServer } = require('apollo-server-express');
const mongoose = require('mongoose');
const cors = require('cors');
const typeDefs = require('./graphql/typeDefs/orderTypeDefs');
const resolvers = require('./graphql/resolvers/orderResolvers');

// Initialize express
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smartorder_orders', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

// Apollo Server setup
const startApolloServer = async () => {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: ({ req }) => {
      // Here you would normally extract the user from the request
      // and add it to the context
      const token = req.headers.authorization || '';

      // For now, we'll return a simple context
      return { token };
    },
    formatError: (err) => {
      console.error(err);

      // Don't expose internal server errors to the client
      if (err.message.startsWith('Database Error:')) {
        return new Error('Internal server error');
      }

      // Otherwise return the original error
      return err;
    }
  });

  await server.start();
  server.applyMiddleware({ app, path: '/graphql' });

  console.log(`Apollo Server running at http://localhost:${PORT}${server.graphqlPath}`);
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', service: 'orders-service' });
});

// Set port
const PORT = process.env.PORT || 4003;

// Start server
const startServer = async () => {
  await connectDB();
  await startApolloServer();

  app.listen(PORT, () => {
    console.log(`Order service running on port ${PORT}`);
  });
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...');
  console.error(err);
  process.exit(1);
});

// Start the server
startServer(); 