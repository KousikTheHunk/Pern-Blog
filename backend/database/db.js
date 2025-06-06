/* import mongoose from "mongoose";

const connectDB = async()=>{
    try {
        await mongoose.connect(process.env.MONGO_URI)
        console.log("MongoDB connected successfully");
        
    } catch (error) {
        console.log("MongoDB connection error", error);
        
    }
}

*/

import pg from "pg" ;




export const pool = new pg.Pool({
    user: "postgres",
    password: "kousik",
    host: "localhost",
    port: 5432,
    database: "Blog DB"
});


async function createUsersTable() {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        bio TEXT NOT NULL DEFAULT '',
        occupation VARCHAR(150),
        photo_url TEXT NOT NULL DEFAULT '',
        instagram VARCHAR(255) NOT NULL DEFAULT '',
        linkedin VARCHAR(255) NOT NULL DEFAULT '',
        github VARCHAR(255) NOT NULL DEFAULT '',
        facebook VARCHAR(255) NOT NULL DEFAULT '',
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `;
  
    try {
      await pool.query(createTableQuery);
      console.log("Users table created successfully");
    } catch (error) {
      console.error("Error while creating users table", error);
    }
  
}





async function createCommentsTable() {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS comments (
        id                SERIAL PRIMARY KEY,
        content           TEXT NOT NULL,
        post_id           INTEGER NOT NULL REFERENCES blogs(id) ON DELETE CASCADE,
        user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        parent_comment_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
        likes             INTEGER[] NOT NULL DEFAULT '{}',
        number_of_likes   INTEGER NOT NULL DEFAULT 0,
        created_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
        );;
      `;
  
    try {
      await pool.query(createTableQuery);
      console.log("Comments table created successfully");
    } catch (error) {
      console.error("Error while creating comments table", error);
    }
  
}




async function createBlogsTable() {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS blogs (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        subtitle TEXT,
        description TEXT,
        thumbnail TEXT,
        author_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        category VARCHAR(100),
        is_published BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `;
  
    try {
      await pool.query(createTableQuery);
      console.log("Blogs table created successfully");
    } catch (error) {
      console.error("Error while creating blogs table", error);
    }
  
}




//  Create the "blog_likes" join table
async function createBlogLikesTable() {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS blog_likes (
        blog_id INTEGER NOT NULL
                 REFERENCES blogs(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL
                 REFERENCES users(id) ON DELETE CASCADE,
        PRIMARY KEY (blog_id, user_id)
      );
    `;
  
    try {
      await pool.query(createTableQuery);
      console.log("Blog_likes table created successfully");
    } catch (error) {
      console.error("Error while creating blog_likes table", error);
    }
}
  



  // Create the "blog_comments" join table
  async function createBlogCommentsTable() {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS blog_comments (
        blog_id    INTEGER NOT NULL
                         REFERENCES blogs(id) ON DELETE CASCADE,
        comment_id INTEGER NOT NULL
                         REFERENCES comments(id) ON DELETE CASCADE,
        PRIMARY KEY (blog_id, comment_id)
      );
    `;
  
    try {
      await pool.query(createTableQuery);
      console.log("Blog_comments table created successfully");
    } catch (error) {
      console.error("Error while creating blog_comments table", error);
    }
  
}



export const connectDB = async () => {
    try {
        /*const pool = new pg.Pool ({ 
            connectionString: '',
            ssl:true 
        }) */

       /* const pool = new pg.Pool({
            user: "postgres",
            password: "kousik",
            host: "localhost",
            port: 5432,
            database: "Blog DB"
        }); */

        /* const result = await pool.query('SELECT * FROM addresses') */

        await createUsersTable();
        await createCommentsTable();
        await createBlogsTable();
        await createBlogLikesTable();
        await createBlogCommentsTable();
        
        console.log(`\n Local postgresql connected `);
        
        /* console.log(result.rows[0]);*/
    
    } catch (error) {
        console.log("Local postgresql connection FAILED ", error);
        process.exit(1)
    }
}







export default connectDB;