const { Restaurant, Category } = require('../models/Restaurant');
const { AuthenticationError, UserInputError } = require('apollo-server-express');

const resolvers = {
  Query: {
    restaurants: async () => {
      try {
        return await Restaurant.find({});
      } catch (error) {
        throw new Error(`Failed to fetch restaurants: ${error.message}`);
      }
    },

    restaurant: async (_, { id }) => {
      try {
        const restaurant = await Restaurant.findById(id);
        if (!restaurant) {
          throw new UserInputError('Restaurant not found');
        }
        return restaurant;
      } catch (error) {
        throw new Error(`Failed to fetch restaurant: ${error.message}`);
      }
    },

    serviceAreas: async (_, { restaurantId }) => {
      try {
        const restaurant = await Restaurant.findById(restaurantId);
        if (!restaurant) {
          throw new UserInputError('Restaurant not found');
        }
        return restaurant.service_areas || [];
      } catch (error) {
        throw new Error(`Failed to fetch service areas: ${error.message}`);
      }
    },

    menuItems: async (_, { restaurantId }) => {
      try {
        const restaurant = await Restaurant.findById(restaurantId);
        if (!restaurant) {
          throw new UserInputError('Restaurant not found');
        }
        return restaurant.menu_items || [];
      } catch (error) {
        throw new Error(`Failed to fetch menu items: ${error.message}`);
      }
    },

    menuItem: async (_, { itemId }) => {
      try {
        const restaurant = await Restaurant.findById(itemId);
        if (!restaurant) {
          throw new UserInputError('Menu item not found');
        }
        return restaurant.menu_items.find(item => item.item_id.toString() === itemId.toString());
      } catch (error) {
        throw new Error(`Failed to fetch menu item: ${error.message}`);
      }
    },

    categories: async (_, { restaurantId }) => {
      try {
        const restaurant = await Restaurant.findById(restaurantId);
        if (!restaurant) {
          throw new UserInputError('Restaurant not found');
        }

        // Get unique categories from menu items
        const categoriesSet = new Set();
        restaurant.menu_items.forEach(item => {
          item.categories.forEach(category => {
            categoriesSet.add(JSON.stringify(category));
          });
        });

        return Array.from(categoriesSet).map(cat => JSON.parse(cat));
      } catch (error) {
        throw new Error(`Failed to fetch categories: ${error.message}`);
      }
    }
  },

  Mutation: {
    events: async (_, { input }) => {
    },
    registerRestaurant: async (_, { restaurantInput }) => {
      try {
        // Check if restaurant with same ID or email already exists
        const existingRestaurant = await Restaurant.findOne({
          $or: [
            { restaurant_id: restaurantInput.restaurant_id },
            { email: restaurantInput.email }
          ]
        });

        if (existingRestaurant) {
          throw new UserInputError('Restaurant already exists with this ID or email');
        }

        const newRestaurant = new Restaurant(restaurantInput);
        return await newRestaurant.save();
      } catch (error) {
        throw new Error(`Failed to register restaurant: ${error.message}`);
      }
    },

    updateRestaurant: async (_, { id, restaurantInput }) => {
      try {
        const restaurant = await Restaurant.findById(id);
        if (!restaurant) {
          throw new UserInputError('Restaurant not found');
        }

        // Check if email is being updated and if it's already in use
        if (restaurantInput.email && restaurantInput.email !== restaurant.email) {
          const emailExists = await Restaurant.findOne({
            email: restaurantInput.email,
            restaurant_id: { $ne: id }
          });

          if (emailExists) {
            throw new UserInputError('Email is already in use by another restaurant');
          }
        }

        Object.keys(restaurantInput).forEach(key => {
          restaurant[key] = restaurantInput[key];
        });

        return await restaurant.save();
      } catch (error) {
        throw new Error(`Failed to update restaurant: ${error.message}`);
      }
    },

    deleteRestaurant: async (_, { id }) => {
      try {
        const result = await Restaurant.deleteOne({ _id: id });
        return result.deletedCount > 0;
      } catch (error) {
        throw new Error(`Failed to delete restaurant: ${error.message}`);
      }
    },

    addServiceArea: async (_, { restaurantId, serviceAreaInput }) => {
      try {
        const restaurant = await Restaurant.findById(restaurantId);
        if (!restaurant) {
          throw new UserInputError('Restaurant not found');
        }

        // Ensure city field is properly mapped
        const serviceArea = {
          ...serviceAreaInput,
          city: serviceAreaInput.city || '',  // Ensure city is always defined
        };

        restaurant.service_areas.push(serviceArea);
        await restaurant.save();

        const newServiceArea = restaurant.service_areas[restaurant.service_areas.length - 1];

        if (!newServiceArea) {
          throw new Error('Service area not found');
        }

        return newServiceArea;
      } catch (error) {
        throw new Error(`Failed to add service area: ${error.message}`);
      }
    },

    updateServiceArea: async (_, { restaurantId, id, serviceAreaInput }) => {
      try {
        const restaurant = await Restaurant.findById(restaurantId);
        if (!restaurant) {
          throw new UserInputError('Restaurant not found');
        }

        const serviceAreaIndex = restaurant.service_areas.findIndex(area => area._id.toString() === id);
        if (serviceAreaIndex === -1) {
          throw new UserInputError('Service area not found in restaurant');
        }

        // Ensure city field is present
        const updatedServiceArea = {
          ...restaurant.service_areas[serviceAreaIndex].toObject(),
          ...serviceAreaInput,
          city: serviceAreaInput.city || restaurant.service_areas[serviceAreaIndex].city || ''
        };

        // Update the service area
        restaurant.service_areas[serviceAreaIndex] = updatedServiceArea;

        await restaurant.save();
        return restaurant.service_areas[serviceAreaIndex];
      } catch (error) {
        throw new Error(`Failed to update service area: ${error.message}`);
      }
    },

    deleteServiceArea: async (_, { restaurantId, id }) => {
      try {
        const restaurant = await Restaurant.findById(restaurantId);
        if (!restaurant) {
          throw new UserInputError('Service area not found');
        }

        const initialLength = restaurant.service_areas.length;
        restaurant.service_areas = restaurant.service_areas.filter(area => area._id.toString() !== id);

        if (initialLength === restaurant.service_areas.length) {
          return false;
        }

        await restaurant.save();
        return true;
      } catch (error) {
        throw new Error(`Failed to delete service area: ${error.message}`);
      }
    },

    checkRestaurantServiceArea: async (_, { restaurantId, latitude, longitude }) => {
      try {
        const restaurant = await Restaurant.findById(restaurantId);
        if (!restaurant) {
          throw new UserInputError('Restaurant not found');
        }

        const polygons = restaurant.service_areas.filter(polygon => polygon.is_active).map(area => area.polygon_coordinates);

        if (polygons.length === 0) {
          return false;
        }

        const isPointInPolygon = polygons.filter(polygon => {
          return polygon.some(point => {
            return point.latitude === latitude && point.longitude === longitude;
          });
        }).length > 0;

        if (isPointInPolygon) {
          return true;
        }

        return false;
      } catch (error) {
        throw new Error(`Failed to check service area: ${error.message}`);
      }
    },

    addMenuItem: async (_, { restaurantId, menuItemInput }) => {
      try {
        const restaurant = await Restaurant.findById(restaurantId);
        if (!restaurant) {
          throw new UserInputError('Restaurant not found');
        }

        restaurant.menu_items.push(menuItemInput);
        await restaurant.save();

        return menuItemInput;
      } catch (error) {
        throw new Error(`Failed to add menu item: ${error.message}`);
      }
    },

    updateMenuItem: async (_, { restaurantId, id, menuItemInput }) => {
      try {
        const restaurant = await Restaurant.findById(restaurantId);
        if (!restaurant) {
          throw new UserInputError('Menu item not found');
        }

        const menuItemIndex = restaurant.menu_items.findIndex(item => item._id.toString() === id);
        if (menuItemIndex === -1) {
          throw new UserInputError('Menu item not found');
        }

        // Update the menu item
        restaurant.menu_items[menuItemIndex] = {
          ...restaurant.menu_items[menuItemIndex].toObject(),
          ...menuItemInput
        };

        await restaurant.save();
        return restaurant.menu_items[menuItemIndex];
      } catch (error) {
        throw new Error(`Failed to update menu item: ${error.message}`);
      }
    },

    deleteMenuItem: async (_, { restaurantId, id }) => {
      try {
        const restaurant = await Restaurant.findById(restaurantId);
        if (!restaurant) {
          throw new UserInputError('Restaurant not found');
        }

        const initialLength = restaurant.menu_items.length;
        restaurant.menu_items = restaurant.menu_items.filter(item => item._id.toString() !== id);

        if (initialLength === restaurant.menu_items.length) {
          return false;
        }

        await restaurant.save();
        return true;
      } catch (error) {
        throw new Error(`Failed to delete menu item: ${error.message}`);
      }
    },

    addCategory: async (_, { categoryInput }) => {
      try {
        const category = await Category.create(categoryInput);
        return category;
      } catch (error) {
        throw new Error(`Failed to add category: ${error.message}`);
      }
    },

    updateCategory: async (_, { id, categoryInput }) => {
      try {
        const category = await Category.findByIdAndUpdate(id, categoryInput, { new: true });
        return category;
      } catch (error) {
        throw new Error(`Failed to update category: ${error.message}`);
      }
    },

    deleteCategory: async (_, { id }) => {
      try {
        const category = await Category.findByIdAndDelete(id);
        if (!category) {
          throw new UserInputError('Category not found');
        }
        return true;
      } catch (error) {
        throw new Error(`Failed to delete category: ${error.message}`);
      }
    }
  }
};

module.exports = resolvers; 