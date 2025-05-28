// Create root user
db.createUser({
    user: 'admin',
    pwd: '123456',
    roles: [
        { role: 'root', db: 'admin' },
        { role: 'userAdminAnyDatabase', db: 'admin' },
        { role: 'dbAdminAnyDatabase', db: 'admin' },
        { role: 'readWriteAnyDatabase', db: 'admin' }
    ]
});

// Authenticate as admin
db.auth('admin', '123456');

// List of databases to create
const databases = [
    'users',
    'orders',
    'restaurants',
    'notifications',
    'messages',
    'logger',
    'event-bus'
];

// Create each database and its user
databases.forEach(dbName => {
    db = db.getSiblingDB(dbName);

    // Create user for this database
    db.createUser({
        user: 'admin',
        pwd: '123456',
        roles: [
            {
                role: 'readWrite',
                db: dbName
            },
            {
                role: 'dbAdmin',
                db: dbName
            }
        ]
    });

    // Create a dummy collection to ensure database is created
    db.createCollection('init');
});

print('Database initialization completed successfully!'); 