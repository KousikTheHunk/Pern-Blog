
import cloudinary from "../utils/cloudinary.js";
import getDataUri from "../utils/dataUri.js";


import { pool } from "../database/db.js";



// Create a new blog post
/*  export const createBlog = async (req,res) => {
    try {
        const {title, category} = req.body;
        if(!title || !category) {
            return res.status(400).json({
                message:"Blog title and category is required."
            })
        }

        const blog = await Blog.create({
            title,
            category,
            author:req.id
        })

        return res.status(201).json({
            success:true,
            blog,
            message:"Blog Created Successfully."
        })
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message:"Failed to create blog"
        })
    }
}

*/



// Create a new blog post 
export const createBlog = async (req, res) => {
    try {
      const { title, category } = req.body;
      if (!title || !category) {
        return res.status(400).json({
          message: "Blog title and category are required.",
        });
      }
  
      // Insert into PostgreSQL "blogs" table
      const insertQuery = `
        INSERT INTO blogs (title, category, author_id )
        VALUES ($1, $2, $3)
        RETURNING *;
      `;
      const values = [title, category, req.id];
  
      const { rows } = await pool.query(insertQuery, values);
      const blog = rows[0];
  
      return res.status(201).json({
        success: true,
        blog,
        message: "Blog Created Successfully.",
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        message: "Failed to create blog",
      });
    }
  
};



/* export const updateBlog = async (req, res) => {
    try {
        const blogId = req.params.blogId
        const { title, subtitle, description, category } = req.body;
        const file = req.file;

        let blog = await Blog.findById(blogId).populate("author");
        if(!blog){
            return res.status(404).json({
                message:"Blog not found!"
            })
        }
        let thumbnail;
        if (file) {
            const fileUri = getDataUri(file)
            thumbnail = await cloudinary.uploader.upload(fileUri)
        }

        const updateData = {title, subtitle, description, category,author: req.id, thumbnail: thumbnail?.secure_url};
        blog = await Blog.findByIdAndUpdate(blogId, updateData, {new:true});

        res.status(200).json({ success: true, message: "Blog updated successfully", blog });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error updating blog", error: error.message });
    }
}; */



export const updateBlog = async (req, res) => {
    try {
      const blogId = parseInt(req.params.blogId, 10);
      const { title, subtitle, description, category } = req.body;
      const file = req.file;
  
      // 1) Check if the blog exists
      const findQuery = `
        SELECT *
        FROM blogs
        WHERE id = $1;
      `;
      const { rows: existingRows } = await pool.query(findQuery, [blogId]);
      if (existingRows.length === 0) {
        return res.status(404).json({ message: "Blog not found!" });
      }


      if (file) {
        try {
          // 1) Extract the public_id from the old thumbnail URL
          //    e.g. https://res.cloudinary.com/your_cloud/image/upload/v1610000000/my-folder/my-image.jpg
          //    → publicId = "my-folder/my-image"
          const parsedUrl = new URL(existingRows[0].thumbnail);
          // parsedUrl.pathname might be "/your_cloud/image/upload/v1610000000/my-folder/my-image.jpg"
          // We just need everything after "/upload/" and strip the extension.
          const pathAfterUpload = parsedUrl.pathname.split("/upload/")[1]; 
          // e.g. "v1610000000/my-folder/my-image.jpg"
          // Remove the version segment ("v1610000000/") if present:
          const withoutVersion = pathAfterUpload.replace(/^v\d+\//, "");
          // Now remove the file extension:
          const publicId = withoutVersion.replace(/\.[^/.]+$/, ""); 
          // e.g. publicId = "my-folder/my-image"
      
          // 2) Destroy the old image by its public_id
          await cloudinary.uploader.destroy(publicId);
          // (You could check the response if you want, e.g. `{ result: "ok" }`)
      
        } catch (destroyError) {
          console.warn("Failed to delete old Cloudinary image:", destroyError);
          // You can choose to proceed with upload anyway, or return an error.
        }
      }
  
      // 2) Handle thumbnail upload (if a new file was provided)
      let thumbnailUrl = existingRows[0].thumbnail; // keep existing URL by default
      if (file) {
        const fileUri = getDataUri(file);
        const uploadResult = await cloudinary.uploader.upload(fileUri);
        thumbnailUrl = uploadResult.secure_url;
      }
  
      // 3) Perform the UPDATE
      const updateQuery = `
        UPDATE blogs
        SET
          title       = $1,
          subtitle    = $2,
          description = $3,
          category    = $4,
          author_id   = $5,
          thumbnail   = $6,
          updated_at  = CURRENT_TIMESTAMP
        WHERE id = $7
        RETURNING *;
      `;
      const values = [
        title,
        subtitle,
        description,
        category,
        req.id,        // new author_id
        thumbnailUrl,  // new or existing thumbnail URL
        blogId
      ];
  
      const { rows } = await pool.query(updateQuery, values);
      const updatedBlog = rows[0];
  
      return res.status(200).json({
        success: true,
        message: "Blog updated successfully",
        blog: updatedBlog
      });
    } catch (error) {
      console.error("Error updating blog:", error);
      return res.status(500).json({
        success: false,
        message: "Error updating blog",
        error: error.message
      });
    }
  
};



/*  export const getAllBlogs = async (_, res) => {
    try {
        const blogs = await Blog.find().sort({ createdAt: -1 }).populate({
            path: 'author',
            select: 'firstName lastName photoUrl'
        }).populate({
            path: 'comments',
            sort: { createdAt: -1 },
            populate: {
                path: 'userId',
                select: 'firstName lastName photoUrl'
            }
        });
        res.status(200).json({ success: true, blogs });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching blogs", error: error.message });
    }
};*/



export const getAllBlogs = async (_, res) => {
    try {
      // 1) Fetch all blogs with their author’s basic info, sorted by created_at descending
      const blogsQuery = `
        SELECT
          b.id,
          b.title,
          b.subtitle,
          b.description,
          b.thumbnail,
          b.category,
          b.is_published,
          b.created_at,
          b.updated_at,
          u.id   AS author_id,
          u.first_name AS author_first_name,
          u.last_name  AS author_last_name,
          u.photo_url  AS author_photo_url
        FROM blogs b
        LEFT JOIN users u
          ON b.author_id = u.id
        ORDER BY b.created_at DESC;
      `;
      const { rows: blogRows } = await pool.query(blogsQuery);
  
      // 2) For each blog, fetch its comments (with commenter info), sorted by created_at descending
      const getCommentsForBlog = async (blogId) => {
        const commentsQuery = `
          SELECT
            c.id,
            c.content,
            c.likes,
            c.number_of_likes,
            c.created_at,
            c.updated_at,
            cu.id   AS user_id,
            cu.first_name AS user_first_name,
            cu.last_name  AS user_last_name,
            cu.photo_url  AS user_photo_url
          FROM blog_comments bc
          JOIN comments c
            ON bc.comment_id = c.id
          JOIN users cu
            ON c.user_id = cu.id
          WHERE bc.blog_id = $1
          ORDER BY c.created_at DESC;
        `;
        const { rows: commentRows } = await pool.query(commentsQuery, [blogId]);
        return commentRows.map((r) => ({
          id: r.id,
          content: r.content,
          likes: r.likes,
          numberOfLikes: r.number_of_likes,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
          user: {
            id: r.user_id,
            firstName: r.user_first_name,
            lastName: r.user_last_name,
            photoUrl: r.user_photo_url
          }
        }));
      };
  
      // 3) Assemble full blog objects with nested comments
      const blogs = await Promise.all(
        blogRows.map(async (r) => {
          const comments = await getCommentsForBlog(r.id);
          return {
            id: r.id,
            title: r.title,
            subtitle: r.subtitle,
            description: r.description,
            thumbnail: r.thumbnail,
            category: r.category,
            isPublished: r.is_published,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
            author: {
              id: r.author_id,
              firstName: r.author_first_name,
              lastName: r.author_last_name,
              photoUrl: r.author_photo_url
            },
            comments
          };
        })
      );
  
      res.status(200).json({ success: true, blogs });
    } catch (error) {
      console.error("Error fetching blogs:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching blogs",
        error: error.message
      });
    }
  
};


/* export const getPublishedBlog = async (_,res) => {
    try {
        const blogs = await Blog.find({isPublished:true}).sort({ createdAt: -1 }).populate({path:"author", select:"firstName lastName photoUrl"}).populate({
            path: 'comments',
            sort: { createdAt: -1 },
            populate: {
                path: 'userId',
                select: 'firstName lastName photoUrl'
            }
        });
        if(!blogs){
            return res.status(404).json({
                message:"Blog not found"
            })
        }
        return res.status(200).json({
            success:true,
            blogs,
        })
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message:"Failed to get published blogs"
        })
    }
}*/




export const getPublishedBlog = async (_, res) => {
    try {
      // 1) Fetch all published blogs with their author’s basic info, sorted by created_at descending
      const blogsQuery = `
        SELECT
          b.id,
          b.title,
          b.subtitle,
          b.description,
          b.thumbnail,
          b.category,
          b.is_published,
          b.created_at,
          b.updated_at,
          u.id           AS author_id,
          u.first_name   AS author_first_name,
          u.last_name    AS author_last_name,
          u.photo_url    AS author_photo_url
        FROM blogs b
        LEFT JOIN users u
          ON b.author_id = u.id
        WHERE b.is_published = TRUE
        ORDER BY b.created_at DESC;
      `;
      const { rows: blogRows } = await pool.query(blogsQuery);
  
      // 2) If no published blogs found, return 404
      if (blogRows.length === 0) {
        return res.status(404).json({
          message: "No published blogs found"
        });
      }
  
      // 3) For each blog, fetch its comments (with commenter info), sorted by created_at descending
      const getCommentsForBlog = async (blogId) => {
        const commentsQuery = `
          SELECT
            c.id,
            c.content,
            c.likes,
            c.number_of_likes,
            c.created_at,
            c.updated_at,
            cu.id           AS user_id,
            cu.first_name   AS user_first_name,
            cu.last_name    AS user_last_name,
            cu.photo_url    AS user_photo_url
          FROM blog_comments bc
          JOIN comments c
            ON bc.comment_id = c.id
          JOIN users cu
            ON c.user_id = cu.id
          WHERE bc.blog_id = $1
          ORDER BY c.created_at DESC;
        `;
        const { rows: commentRows } = await pool.query(commentsQuery, [blogId]);
        return commentRows.map((r) => ({
          id: r.id,
          content: r.content,
          likes: r.likes,
          numberOfLikes: r.number_of_likes,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
          user: {
            id: r.user_id,
            firstName: r.user_first_name,
            lastName: r.user_last_name,
            photoUrl: r.user_photo_url
          }
        }));
      };
  
      // 4) Assemble full blog objects with nested comments
      const blogs = await Promise.all(
        blogRows.map(async (r) => {
          const comments = await getCommentsForBlog(r.id);
          return {
            id: r.id,
            title: r.title,
            subtitle: r.subtitle,
            description: r.description,
            thumbnail: r.thumbnail,
            category: r.category,
            isPublished: r.is_published,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
            author: {
              id: r.author_id,
              firstName: r.author_first_name,
              lastName: r.author_last_name,
              photoUrl: r.author_photo_url
            },
            comments
          };
        })
      );
  
      return res.status(200).json({ success: true, blogs });
    } catch (error) {
      console.error("Error fetching published blogs:", error);
      return res.status(500).json({
        message: "Failed to get published blogs",
        error: error.message
      });
    }
  
};




/* export const togglePublishBlog = async (req,res) => {
    try {
        const {blogId} = req.params;
        const {publish} = req.query; // true, false
        console.log(req.query);
        
        const blog = await Blog.findById(blogId);
        if(!blog){
            return res.status(404).json({
                message:"Blog not found!"
            });
        }
        // publish status based on the query paramter
        blog.isPublished = !blog.isPublished
        await blog.save();

        const statusMessage = blog.isPublished ? "Published" : "Unpublished";
        return res.status(200).json({
            success:true,
            message:`Blog is ${statusMessage}`
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message:"Failed to update status"
        })
    }
} */



export const togglePublishBlog = async (req, res) => {
    try {
      const blogId = parseInt(req.params.blogId, 10);
  
      // 1) Verify that the blog exists
      const findQuery = `
        SELECT is_published
        FROM blogs
        WHERE id = $1;
      `;
      const { rows: findRows } = await pool.query(findQuery, [blogId]);
      if (findRows.length === 0) {
        return res.status(404).json({ message: "Blog not found!" });
      }
  
      // 2) Toggle is_published in a single SQL statement
      const updateQuery = `
        UPDATE blogs
        SET is_published = NOT is_published,
            updated_at   = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING is_published;
      `;
      const { rows: updateRows } = await pool.query(updateQuery, [blogId]);
      const newStatus = updateRows[0].is_published;
  
      const statusMessage = newStatus ? "Published" : "Unpublished";
      return res.status(200).json({
        success: true,
        message: `Blog is ${statusMessage}`
      });
    } catch (error) {
      console.error("Error toggling publish status:", error);
      return res.status(500).json({
        message: "Failed to update status",
        error: error.message
      });
    }
  
};


/*export const getOwnBlogs = async (req, res) => {
    try {
        const userId = req.id; // Assuming `req.id` contains the authenticated user’s ID

        if (!userId) {
            return res.status(400).json({ message: "User ID is required." });
        }

        const blogs = await Blog.find({ author: userId }).populate({
            path: 'author',
            select: 'firstName lastName photoUrl'
        }).populate({
            path: 'comments',
            sort: { createdAt: -1 },
            populate: {
                path: 'userId',
                select: 'firstName lastName photoUrl'
            }
        });;

        if (!blogs) {
            return res.status(404).json({ message: "No blogs found.", blogs: [], success: false });
        }

        return res.status(200).json({ blogs, success: true });
    } catch (error) {
        res.status(500).json({ message: "Error fetching blogs", error: error.message });
    }
};*/



/*  export const getOwnBlogs = async (req, res) => {
    try {
      const userId = parseInt(req.id, 10); // authenticated user’s ID
  
      if (!userId) {
        return res.status(400).json({ message: "User ID is required." });
      }
  
      // 1) Fetch all blogs where author_id = userId, including author info, sorted by created_at DESC
      const blogsQuery = `
        SELECT
          b.id,
          b.title,
          b.subtitle,
          b.description,
          b.thumbnail,
          b.category,
          b.is_published,
          b.created_at,
          b.updated_at,
          u.id           AS author_id,
          u.first_name   AS author_first_name,
          u.last_name    AS author_last_name,
          u.photo_url    AS author_photo_url
        FROM blogs b
        LEFT JOIN users u
          ON b.author_id = u.id
        WHERE b.author_id = $1
        ORDER BY b.created_at DESC;
      `;
      const { rows: blogRows } = await pool.query(blogsQuery, [userId]);
  
      if (blogRows.length === 0) {
        return res
          .status(404)
          .json({ message: "No blogs found.", blogs: [], success: false });
      }
  
      // 2) For each blog, fetch its comments (with commenter info), sorted by created_at DESC
      const getCommentsForBlog = async (blogId) => {
        const commentsQuery = `
          SELECT
            c.id,
            c.content,
            c.likes,
            c.number_of_likes,
            c.created_at,
            c.updated_at,
            cu.id           AS user_id,
            cu.first_name   AS user_first_name,
            cu.last_name    AS user_last_name,
            cu.photo_url    AS user_photo_url
          FROM blog_comments bc
          JOIN comments c
            ON bc.comment_id = c.id
          JOIN users cu
            ON c.user_id = cu.id
          WHERE bc.blog_id = $1
          ORDER BY c.created_at DESC;
        `;
        const { rows: commentRows } = await pool.query(commentsQuery, [blogId]);
        return commentRows.map((r) => ({
          id: r.id,
          content: r.content,
          likes: r.likes,
          numberOfLikes: r.number_of_likes,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
          user: {
            id: r.user_id,
            firstName: r.user_first_name,
            lastName: r.user_last_name,
            photoUrl: r.user_photo_url,
          },
        }));
      };
  
      // 3) Assemble full blog objects with nested comments
      const blogs = await Promise.all(
        blogRows.map(async (r) => {
          const comments = await getCommentsForBlog(r.id);
          return {
            id: r.id,
            title: r.title,
            subtitle: r.subtitle,
            description: r.description,
            thumbnail: r.thumbnail,
            category: r.category,
            isPublished: r.is_published,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
            author: {
              id: r.author_id,
              firstName: r.author_first_name,
              lastName: r.author_last_name,
              photoUrl: r.author_photo_url,
            },
            comments,
          };
        })
      );
  
      return res.status(200).json({ blogs, success: true });
    } catch (error) {
      console.error("Error fetching own blogs:", error);
      return res
        .status(500)
        .json({ message: "Error fetching blogs", error: error.message });
    }
  
};

*/



/* export const getOwnBlogs = async (req, res) => {
    try {
      // 1) Grab the authenticated user’s ID from req.id (set by isAuthenticated)
      const userId = parseInt(req.id, 10);
      if (!userId) {
        return res
          .status(400)
          .json({ success: false, message: "User ID is required." });
      }
  
      // 2) Fetch all blogs where author_id = userId (most recent first)
      const blogsQuery = `
        SELECT
          b.id,
          b.title,
          b.subtitle,
          b.description,
          b.thumbnail,
          b.category,
          b.is_published,
          b.created_at,
          b.updated_at,
          u.id           AS author_id,
          u.first_name   AS author_first_name,
          u.last_name    AS author_last_name,
          u.photo_url    AS author_photo_url
        FROM blogs b
        JOIN users u
          ON b.author_id = u.id
        WHERE b.author_id = $1
        ORDER BY b.created_at DESC;
      `;
      const { rows: blogRows } = await pool.query(blogsQuery, [userId]);
  
      // 3) If no blogs found, return an empty list (success: true)
      if (blogRows.length === 0) {
        return res
          .status(200)
          .json({ success: true, blogs: [], message: "No blogs found." });
      }
  
      const getCommentsForBlog = async (blogId) => {
        const commentsQuery = `
          SELECT
            c.id,
            c.content,
            c.likes,
            c.number_of_likes,
            c.created_at,
            c.updated_at,
            cu.id           AS user_id,
            cu.first_name   AS user_first_name,
            cu.last_name    AS user_last_name,
            cu.photo_url    AS user_photo_url
          FROM comments c
          JOIN users cu
            ON c.user_id = cu.id
          WHERE c.post_id = $1
          ORDER BY c.created_at DESC;
        `;
        const { rows: commentRows } = await pool.query(commentsQuery, [blogId]);
      
        return commentRows.map((r) => ({
          id: r.id,
          content: r.content,
          likes: r.likes || [],
          numberOfLikes: r.number_of_likes,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
          user: {
            id: r.user_id,
            firstName: r.user_first_name,
            lastName: r.user_last_name,
            photoUrl: r.user_photo_url,
          },
        }));
      };
      
  
      // 5) Assemble full blog objects (with nested comments)
      const blogs = await Promise.all(
        blogRows.map(async (r) => {
          const comments = await getCommentsForBlog(r.id);
          return {
            id: r.id,
            title: r.title,
            subtitle: r.subtitle,
            description: r.description,
            thumbnail: r.thumbnail,
            category: r.category,
            isPublished: r.is_published,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
            author: {
              id: r.author_id,
              firstName: r.author_first_name,
              lastName: r.author_last_name,
              photoUrl: r.author_photo_url,
            },
            comments,
          };
        })
      );
  
      // 6) Return the result
      return res.status(200).json({ success: true, blogs });
    } catch (error) {
      console.error("Error fetching own blogs:", error);
      return res
        .status(500)
        .json({ success: false, message: "Error fetching blogs", error: error.message });
    }
  };


  */



  export const getOwnBlogs = async (req, res) => {
    try {
      const userId = parseInt(req.id, 10);
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "User ID is required.",
        });
      }
  
      // 1) Fetch the user’s own blogs
      const blogsQuery = `
        SELECT
          b.id,
          b.title,
          b.subtitle,
          b.description,
          b.thumbnail,
          b.category,
          b.is_published,
          b.created_at,
          b.updated_at,
          u.id           AS author_id,
          u.first_name   AS author_first_name,
          u.last_name    AS author_last_name,
          u.photo_url    AS author_photo_url
        FROM blogs b
        JOIN users u
          ON b.author_id = u.id
        WHERE b.author_id = $1
        ORDER BY b.created_at DESC;
      `;
      const { rows: blogRows } = await pool.query(blogsQuery, [userId]);
  
      // 2) If no blogs, return empty array
      if (blogRows.length === 0) {
        return res.status(200).json({
          success: true,
          blogs: [],
          message: "No blogs found.",
        });
      }
  
      // 3) Helper to fetch comments via the join table
      const getCommentsForBlog = async (blogId) => {
        const commentsQuery = `
          SELECT
            c.id,
            c.content,
            c.likes,
            c.number_of_likes,
            c.created_at,
            c.updated_at,
            cu.id           AS user_id,
            cu.first_name   AS user_first_name,
            cu.last_name    AS user_last_name,
            cu.photo_url    AS user_photo_url
          FROM blog_comments bc
          JOIN comments c
            ON bc.comment_id = c.id
          JOIN users cu
            ON c.user_id = cu.id
          WHERE bc.blog_id = $1
          ORDER BY c.created_at DESC;
        `;
        const { rows: commentRows } = await pool.query(commentsQuery, [blogId]);
  
        return commentRows.map((r) => ({
          id: r.id,
          content: r.content,
          likes: r.likes || [],
          numberOfLikes: r.number_of_likes,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
          user: {
            id: r.user_id,
            firstName: r.user_first_name,
            lastName: r.user_last_name,
            photoUrl: r.user_photo_url,
          },
        }));
      };
  
      // 4) Build the final blog objects with nested comments
      const blogs = await Promise.all(
        blogRows.map(async (r) => {
          const comments = await getCommentsForBlog(r.id);
          return {
            id: r.id,
            title: r.title,
            subtitle: r.subtitle,
            description: r.description,
            thumbnail: r.thumbnail,
            category: r.category,
            isPublished: r.is_published,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
            author: {
              id: r.author_id,
              firstName: r.author_first_name,
              lastName: r.author_last_name,
              photoUrl: r.author_photo_url,
            },
            comments,
          };
        })
      );
  
      // 5) Return the assembled result
      return res.status(200).json({
        success: true,
        blogs,
      });
    } catch (error) {
      console.error("Error fetching own blogs:", error);
      return res.status(500).json({
        success: false,
        message: "Error fetching blogs",
        error: error.message,
      });
    }
  };
  



// Delete a blog post
/*export const deleteBlog = async (req, res) => {
    try {
        const blogId = req.params.id;
        const authorId = req.id
        const blog = await Blog.findById(blogId);
        if (!blog) {
            return res.status(404).json({ success: false, message: "Blog not found" });
        }
        if (blog.author.toString() !== authorId) {
            return res.status(403).json({ success: false, message: 'Unauthorized to delete this blog' });
        }

        // Delete blog
        await Blog.findByIdAndDelete(blogId);

        // Delete related comments
        await Comment.deleteMany({ postId: blogId });


        res.status(200).json({ success: true, message: "Blog deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error deleting blog", error: error.message });
    }
}; */



export const deleteBlog = async (req, res) => {
    try {
      const blogId = parseInt(req.params.id, 10);
      const authorId = parseInt(req.id, 10); // authenticated user’s ID
  
      // 1) Check if the blog exists and get its author_id
      const findQuery = `
        SELECT author_id
        FROM blogs
        WHERE id = $1;
      `;
      const { rows: findRows } = await pool.query(findQuery, [blogId]);
  
      if (findRows.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Blog not found" });
      }
  
      const blogAuthorId = findRows[0].author_id;
      if (blogAuthorId !== authorId) {
        return res
          .status(403)
          .json({ success: false, message: "Unauthorized to delete this blog" });
      }
  
      // 2) Delete related comments first (if comments.post_id does NOT have ON DELETE CASCADE)
      const deleteCommentsQuery = `
        DELETE FROM comments
        WHERE post_id = $1;
      `;
      await pool.query(deleteCommentsQuery, [blogId]);
  
      // 3) Delete the blog itself
      const deleteBlogQuery = `
        DELETE FROM blogs
        WHERE id = $1;
      `;
      await pool.query(deleteBlogQuery, [blogId]);
  
      return res
        .status(200)
        .json({ success: true, message: "Blog deleted successfully" });
    } catch (error) {
      console.error("Error deleting blog:", error);
      return res.status(500).json({
        success: false,
        message: "Error deleting blog",
        error: error.message,
      });
    }
  
};



/* export const likeBlog = async (req, res) => {
    try {
        const blogId = req.params.id;
        const likeKrneWalaUserKiId = req.id;
        const blog = await Blog.findById(blogId).populate({path:'likes'});
        if (!blog) return res.status(404).json({ message: 'Blog not found', success: false })

        // Check if user already liked the blog
        // const alreadyLiked = blog.likes.includes(userId);

        //like logic started
        await blog.updateOne({ $addToSet: { likes: likeKrneWalaUserKiId } });
        await blog.save();


        return res.status(200).json({ message: 'Blog liked', blog, success: true });
    } catch (error) {
        console.log(error);

    }
}*/


export const likeBlog = async (req, res) => {
    const blogId = parseInt(req.params.id, 10);
    const userId = req.id; // assume req.id is set by your auth middleware
  
    try {
      // 1) Verify the blog exists:
      const blogCheck = await pool.query(
        `SELECT 1 FROM blogs WHERE id = $1;`,
        [blogId]
      );
      if (blogCheck.rowCount === 0) {
        return res.status(404).json({
          success: false,
          message: "Blog not found"
        });
      }
  
      // 2) Insert into blog_likes (ON CONFLICT DO NOTHING to avoid duplicates)
      await pool.query(
        `
        INSERT INTO blog_likes (blog_id, user_id)
        VALUES ($1, $2)
        ON CONFLICT (blog_id, user_id) DO NOTHING;
        `,
        [blogId, userId]
      );
  
      // 3) (Optional) Fetch updated likes array or count:
      //    Here we fetch the array of all user_ids who have liked this blog:
      const { rows } = await pool.query(
        `
        SELECT array_agg(user_id) AS likes_list,
               COUNT(*)::INTEGER    AS like_count
        FROM blog_likes
        WHERE blog_id = $1;
        `,
        [blogId]
      );
  
      const likesArray = rows[0].likes_list || [];     // e.g. [2, 7, 12]
      const likeCount  = rows[0].like_count || 0;       // e.g. 3
  
      // Return success along with the blog’s updated “likes” info
      return res.status(200).json({
        success: true,
        message: "Blog liked",
        data: {
          blogId,
          likes: likesArray,
          likeCount
        }
      });
    } catch (error) {
      console.error("Error in likeBlog:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  
};




/* export const dislikeBlog = async (req, res) => {
    try {
        const likeKrneWalaUserKiId = req.id;
        const blogId = req.params.id;
        const blog = await Blog.findById(blogId);
        if (!blog) return res.status(404).json({ message: 'post not found', success: false })

        //dislike logic started
        await blog.updateOne({ $pull: { likes: likeKrneWalaUserKiId } });
        await blog.save();

        return res.status(200).json({ message: 'Blog disliked', blog, success: true });
    } catch (error) {
        console.log(error);

    }
} */



export const dislikeBlog = async (req, res) => {
    const userId = req.id;              // The user who is “disliking”
    const blogId = parseInt(req.params.id, 10);
  
    try {
      // 1) Verify the blog exists:
      const blogCheck = await pool.query(
        `SELECT 1 FROM blogs WHERE id = $1;`,
        [blogId]
      );
      if (blogCheck.rowCount === 0) {
        return res.status(404).json({
          success: false,
          message: "Blog not found"
        });
      }
  
      // 2) Delete this user's like from blog_likes (if it exists):
      await pool.query(
        `
        DELETE
        FROM blog_likes
        WHERE blog_id = $1
          AND user_id = $2;
        `,
        [blogId, userId]
      );
  
      // 3) (Optional) Fetch the updated like count and/or likes array
      const { rows } = await pool.query(
        `
        SELECT 
          COUNT(*)::INTEGER        AS like_count,
          array_agg(user_id)       AS likes_list
        FROM blog_likes
        WHERE blog_id = $1;
        `,
        [blogId]
      );
  
      const likeCount  = rows[0].like_count  || 0;
      const likesArray = rows[0].likes_list  || [];
  
      return res.status(200).json({
        success: true,
        message: "Blog disliked",
        data: {
          blogId,
          likeCount,
          likes: likesArray
        }
      });
    } catch (error) {
      console.error("Error in dislikeBlog:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  
};



/*export const getMyTotalBlogLikes = async (req, res) => {
    try {
      const userId = req.id; // assuming you use authentication middleware
  
      // Step 1: Find all blogs authored by the logged-in user
      const myBlogs = await Blog.find({ author: userId }).select("likes");
  
      // Step 2: Sum up the total likes
      const totalLikes = myBlogs.reduce((acc, blog) => acc + (blog.likes?.length || 0), 0);
  
      res.status(200).json({
        success: true,
        totalBlogs: myBlogs.length,
        totalLikes,
      });
    } catch (error) {
      console.error("Error getting total blog likes:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch total blog likes",
      });
    }
  };*/


  export const getMyTotalBlogLikes = async (req, res) => {
    const userId = req.id; // set by your authentication middleware
  
    try {
      // 1) Count the total number of blogs authored by this user:
      const blogsCountResult = await pool.query(
        `
        SELECT COUNT(*)::INTEGER AS total_blogs
        FROM blogs
        WHERE author_id = $1;
        `,
        [userId]
      );
      const totalBlogs = blogsCountResult.rows[0].total_blogs;
  
      // 2) Count the total likes on all those blogs:
      const likesCountResult = await pool.query(
        `
        SELECT COUNT(*)::INTEGER AS total_likes
        FROM blog_likes bl
        JOIN blogs b ON b.id = bl.blog_id
        WHERE b.author_id = $1;
        `,
        [userId]
      );
      const totalLikes = likesCountResult.rows[0].total_likes;
  
      return res.status(200).json({
        success: true,
        totalBlogs,
        totalLikes
      });
    } catch (error) {
      console.error("Error getting total blog likes:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch total blog likes"
      });
    }
  };