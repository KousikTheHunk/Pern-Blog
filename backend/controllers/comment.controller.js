
import { pool } from "../database/db.js";




  /* export const createComment = async (req, res) => {
  const postId = parseInt(req.params.id, 10);
  const userId = req.id;                // set by your auth middleware
  const { content } = req.body;

  try {
    // 1) Validate that `content` is not empty:
    if (!content || typeof content !== "string" || content.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Content (text) is required"
      });
    }

    // 2) Verify the blog exists (otherwise 404):
    const blogCheck = await pool.query(
      `SELECT 1 FROM blogs WHERE id = $1;`,
      [postId]
    );
    if (blogCheck.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Post (blog) not found"
      });
    }

    // 3) Insert into comments, returning the new comment’s ID + timestamps:
    const insertCommentResult = await pool.query(
      `
      INSERT INTO comments (content, post_id, user_id)
      VALUES ($1, $2, $3)
      RETURNING id, content, post_id, user_id, created_at, updated_at;
      `,
      [content, postId, userId]
    );
    const newCommentId = insertCommentResult.rows[0].id;

    // 4) (Optional) Fetch the newly inserted comment joined to users to get author details:
    const fetchCommentWithUser = await pool.query(
      `
      SELECT
        c.id                   AS comment_id,
        c.content              AS content,
        c.post_id              AS post_id,
        c.user_id              AS user_id,
        u.first_name           AS commenter_first_name,
        u.last_name            AS commenter_last_name,
        u.photo_url            AS commenter_photo_url,
        c.created_at           AS created_at,
        c.updated_at           AS updated_at
      FROM comments c
      JOIN users u
        ON u.id = c.user_id
      WHERE c.id = $1;
      `,
      [newCommentId]
    );
    const populatedComment = fetchCommentWithUser.rows[0];

    // 5) Insert into blog_comments so the blog → comment link is recorded:
    await pool.query(
      `
      INSERT INTO blog_comments (blog_id, comment_id)
      VALUES ($1, $2);
      `,
      [postId, newCommentId]
    );

    // 6) Construct a “comment” object to return (matching your Mongo‐style response):
    const commentToReturn = {
      id: populatedComment.comment_id,
      content: populatedComment.content,
      post_id: populatedComment.post_id,
      user: {
        id: populatedComment.user_id,
        firstName: populatedComment.commenter_first_name,
        lastName: populatedComment.commenter_last_name,
        photoUrl: populatedComment.commenter_photo_url
      },
      created_at: populatedComment.created_at,
      updated_at: populatedComment.updated_at
    };

    return res.status(201).json({
      success: true,
      message: "Comment added",
      comment: commentToReturn
    });
  } catch (error) {
    console.error("Error in createComment:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};


 */



export const createComment = async (req, res) => {
  const postId = parseInt(req.params.id, 10);
  const userId = parseInt(req.id, 10);                // set by your auth middleware
  const { content, parentCommentId } = req.body;      // parentCommentId is optional

  try {
    // 1) Validate that `content` is not empty:
    if (!content || typeof content !== "string" || content.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Content is required"
      });
    }

    // 2) Verify the blog exists (otherwise 404):
    const blogCheck = await pool.query(
      `SELECT 1 FROM blogs WHERE id = $1;`,
      [postId]
    );
    if (blogCheck.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Post (blog) not found"
      });
    }

    // 3) If parentCommentId is provided, ensure it exists and belongs to the same post:
    if (parentCommentId) {
      const parentCheck = await pool.query(
        `
        SELECT 1
        FROM comments
        WHERE id = $1
          AND post_id = $2;
        `,
        [parentCommentId, postId]
      );
      if (parentCheck.rowCount === 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid parentCommentId (does not belong to this post)"
        });
      }
    }

    // 4) Insert into comments (including parent_comment_id)
    const insertCommentResult = await pool.query(
      `
      INSERT INTO comments (
        content,
        post_id,
        user_id,
        parent_comment_id
      ) VALUES ($1, $2, $3, $4)
      RETURNING id, content, post_id, user_id, parent_comment_id, created_at, updated_at;
      `,
      [content, postId, userId, parentCommentId || null]
    );
    const newCommentRow = insertCommentResult.rows[0];
    const newCommentId = newCommentRow.id;

    // 5) Insert into blog_comments so the blog → comment link is recorded:
    await pool.query(
      `
      INSERT INTO blog_comments (blog_id, comment_id)
      VALUES ($1, $2);
      `,
      [postId, newCommentId]
    );

    // 6) Fetch the newly inserted comment joined to users to get author details:
    const fetchCommentWithUser = await pool.query(
      `
      SELECT
        c.id                   AS comment_id,
        c.content              AS content,
        c.post_id              AS post_id,
        c.user_id              AS user_id,
        c.parent_comment_id    AS parent_comment_id,
        u.first_name           AS commenter_first_name,
        u.last_name            AS commenter_last_name,
        u.photo_url            AS commenter_photo_url,
        c.created_at           AS created_at,
        c.updated_at           AS updated_at
      FROM comments c
      JOIN users u
        ON u.id = c.user_id
      WHERE c.id = $1;
      `,
      [newCommentId]
    );
    const populatedComment = fetchCommentWithUser.rows[0];

    // 7) Construct a “comment” object to return (matching your previous format, plus parentCommentId):
    const commentToReturn = {
      id: populatedComment.comment_id,
      content: populatedComment.content,
      post_id: populatedComment.post_id,
      user: {
        id: populatedComment.user_id,
        firstName: populatedComment.commenter_first_name,
        lastName: populatedComment.commenter_last_name,
        photoUrl: populatedComment.commenter_photo_url
      },
      parentCommentId: populatedComment.parent_comment_id,
      created_at: populatedComment.created_at,
      updated_at: populatedComment.updated_at
    };

    return res.status(201).json({
      success: true,
      message: "Comment added",
      comment: commentToReturn
    });
  } catch (error) {
    console.error("Error in createComment:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};





/*  export const getCommentsOfPost = async (req, res) => {
  const blogId = parseInt(req.params.id, 10);

  try {
    // 1) Run the query to fetch comments and join to users:
    const { rows } = await pool.query(
      `
      SELECT
        c.id                             AS comment_id,
        c.content                        AS content,
        c.post_id                        AS post_id,
        c.user_id                        AS user_id,
        u.first_name                     AS commenter_first_name,
        u.last_name                      AS commenter_last_name,
        u.photo_url                      AS commenter_photo_url,
        c.created_at                     AS created_at,
        c.updated_at                     AS updated_at
      FROM comments c
      JOIN users u
        ON u.id = c.user_id
      WHERE c.post_id = $1
      ORDER BY c.created_at DESC;
      `,
      [blogId]
    );

    // 2) If no rows were returned, send a 404 (no comments found)
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No comments found for this blog"
      });
    }

    // 3) Otherwise, map each row into the shape you want to return:
    const comments = rows.map(row => ({
      id: row.comment_id,
      content: row.content,
      postId: row.post_id,
      user: {
        id: row.user_id,
        firstName: row.commenter_first_name,
        lastName: row.commenter_last_name,
        photoUrl: row.commenter_photo_url
      },
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    return res.status(200).json({
      success: true,
      comments
    });
  } catch (error) {
    console.error("Error in getCommentsOfPost:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

*/



export const getCommentsOfPost = async (req, res) => {
  const blogId = parseInt(req.params.id, 10);

  try {
    // 1) Fetch comments + user info + parent_comment_id + likes + number_of_likes + user_id
    const { rows } = await pool.query(
      `
      SELECT
        c.id                             AS comment_id,
        c.content                        AS content,
        c.post_id                        AS post_id,
        c.user_id                        AS user_id,
        u.first_name                     AS commenter_first_name,
        u.last_name                      AS commenter_last_name,
        u.photo_url                      AS commenter_photo_url,
        c.parent_comment_id              AS parent_comment_id,
        c.likes                           AS likes,
        c.number_of_likes                 AS number_of_likes,
        c.created_at                     AS created_at,
        c.updated_at                     AS updated_at
      FROM blog_comments bc
      JOIN comments c
        ON bc.comment_id = c.id
      JOIN users u
        ON u.id = c.user_id
      WHERE bc.blog_id = $1
      ORDER BY c.created_at DESC;
      `,
      [blogId]
    );

    // 2) If no rows, send a 404
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No comments found for this blog"
      });
    }

    // 3) Map each row into the shape you want to return
    const comments = rows.map((row) => ({
      id: row.comment_id,
      content: row.content,
      postId: row.post_id,
      userId: row.user_id,             // <--- include userId
      user: {
        id: row.user_id,
        firstName: row.commenter_first_name,
        lastName: row.commenter_last_name,
        photoUrl: row.commenter_photo_url
      },
      parentCommentId: row.parent_comment_id,
      likes: row.likes || [],                         // <--- include likes array
      numberOfLikes: row.number_of_likes || 0,         // <--- include numberOfLikes
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    return res.status(200).json({
      success: true,
      comments
    });
  } catch (error) {
    console.error("Error in getCommentsOfPost:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};





/*export const getCommentsOfPost = async (req, res) => {
  const blogId = parseInt(req.params.id, 10);

  try {
    // 1) Fetch comments + user info + parent_comment_id
    const { rows } = await pool.query(
      `
      SELECT
        c.id                             AS comment_id,
        c.content                        AS content,
        c.post_id                        AS post_id,
        c.user_id                        AS user_id,
        c.parent_comment_id              AS parent_comment_id,
        u.first_name                     AS commenter_first_name,
        u.last_name                      AS commenter_last_name,
        u.photo_url                      AS commenter_photo_url,
        c.created_at                     AS created_at,
        c.updated_at                     AS updated_at
      FROM blog_comments bc
      JOIN comments c
        ON bc.comment_id = c.id
      JOIN users u
        ON u.id = c.user_id
      WHERE bc.blog_id = $1
      ORDER BY c.created_at DESC;
      `,
      [blogId]
    );

    // 2) If no rows, send a 404 (no comments found)
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No comments found for this blog"
      });
    }

    // 3) Map each row into the shape you want to return (including parentCommentId)
    const comments = rows.map(row => ({
      id: row.comment_id,
      content: row.content,
      postId: row.post_id,
      user: {
        id: row.user_id,
        firstName: row.commenter_first_name,
        lastName: row.commenter_last_name,
        photoUrl: row.commenter_photo_url
      },
      parentCommentId: row.parent_comment_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    return res.status(200).json({
      success: true,
      comments
    });
  } catch (error) {
    console.error("Error in getCommentsOfPost:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

*/




/*  export const deleteComment = async (req, res) => {
  // 1) Parse the inputs
  const commentId = parseInt(req.params.id, 10);
  const authorId  = parseInt(req.id, 10); // assume req.id is set by your auth middleware

  try {
    // 2) Fetch the comment’s owner (user_id) and its post_id
    const fetchComment = await pool.query(
      `
      SELECT user_id, post_id
      FROM comments
      WHERE id = $1;
      `,
      [commentId]
    );

    if (fetchComment.rowCount === 0) {
      // No such comment → 404
      return res.status(404).json({
        success: false,
        message: "Comment not found"
      });
    }

    const { user_id, post_id } = fetchComment.rows[0];

    // 3) Check permission: only the comment’s author can delete it
    if (user_id !== authorId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to delete this comment"
      });
    }

    // 4) Delete the comment row (blog_comments entry will cascade)
    await pool.query(
      `
      DELETE
      FROM comments
      WHERE id = $1;
      `,
      [commentId]
    );

    // 5) Respond with success
    return res.status(200).json({
      success: true,
      message: "Comment deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting comment:", error);
    return res.status(500).json({
      success: false,
      message: "Error deleting comment",
      error: error.message
    });
  }
};

*/




export const deleteComment = async (req, res) => {
  // 1) Parse inputs
  const commentId = parseInt(req.params.id, 10);
  const authorId  = parseInt(req.id, 10); // assume req.id is set by your auth middleware

  try {
    // 2) Fetch the comment’s owner (user_id) to check permission
    const fetchComment = await pool.query(
      `
      SELECT user_id
      FROM comments
      WHERE id = $1;
      `,
      [commentId]
    );

    if (fetchComment.rowCount === 0) {
      // No such comment → 404
      return res.status(404).json({
        success: false,
        message: "Comment not found"
      });
    }

    const { user_id } = fetchComment.rows[0];

    // 3) Check permission: only the comment’s author can delete it
    if (user_id !== authorId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to delete this comment"
      });
    }

    // 4) Delete the comment row (ON DELETE CASCADE on parent_comment_id will remove nested replies)
    await pool.query(
      `
      DELETE
      FROM comments
      WHERE id = $1;
      `,
      [commentId]
    );

    return res.status(200).json({
      success: true,
      message: "Comment deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting comment:", error);
    return res.status(500).json({
      success: false,
      message: "Error deleting comment",
      error: error.message
    });
  }
};





/*  export const editComment = async (req, res) => {
  const userId    = parseInt(req.id, 10);          // ID of the logged-in user
  const newContent = req.body.content?.trim();     // new comment text
  const commentId  = parseInt(req.params.id, 10);  // ID of the comment to edit

  try {
    // 1) Fetch the comment’s user_id (owner) from Postgres:
    const fetchResult = await pool.query(
      `
      SELECT user_id
      FROM comments
      WHERE id = $1;
      `,
      [commentId]
    );
    if (fetchResult.rowCount === 0) {
      // No such comment → 404
      return res.status(404).json({
        success: false,
        message: "Comment not found"
      });
    }

    const ownerId = fetchResult.rows[0].user_id;
    // 2) Check if the current user owns this comment
    if (ownerId !== userId) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to edit this comment"
      });
    }

    // 3) Validate that newContent is non‐empty
    if (!newContent) {
      return res.status(400).json({
        success: false,
        message: "New content is required"
      });
    }

    // 4) Perform the UPDATE, setting content and updated_at, returning the new row:
    const updateResult = await pool.query(
      `
      UPDATE comments
      SET
        content    = $2,
        updated_at = NOW()
      WHERE id = $1
      RETURNING
        id,
        content,
        post_id,
        user_id,
        created_at,
        updated_at;
      `,
      [commentId, newContent]
    );

    const updatedComment = updateResult.rows[0];

    return res.status(200).json({
      success: true,
      message: "Comment updated successfully",
      comment: updatedComment
    });
  } catch (error) {
    console.error("Error editing comment:", error);
    return res.status(500).json({
      success: false,
      message: "Comment is not edited",
      error: error.message
    });
  }
};

*/



export const editComment = async (req, res) => {
  const userId     = parseInt(req.id, 10);          // ID of the logged‐in user
  const commentId  = parseInt(req.params.id, 10);   // ID of the comment to edit
  const newContent = req.body.content?.trim();      // new comment text

  try {
    // 1) Fetch the comment’s owner
    const fetchResult = await pool.query(
      `
      SELECT user_id
      FROM comments
      WHERE id = $1;
      `,
      [commentId]
    );
    if (fetchResult.rowCount === 0) {
      // No such comment → 404
      return res.status(404).json({
        success: false,
        message: "Comment not found"
      });
    }

    const ownerId = fetchResult.rows[0].user_id;

    // 2) Check if the current user owns this comment
    if (ownerId !== userId) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to edit this comment"
      });
    }

    // 3) Validate that newContent is non‐empty
    if (!newContent) {
      return res.status(400).json({
        success: false,
        message: "New content is required"
      });
    }

    // 4) Perform the UPDATE, setting content and updated_at, returning the new row
    const updateResult = await pool.query(
      `
      UPDATE comments
      SET
        content    = $2,
        updated_at = NOW()
      WHERE id = $1
      RETURNING
        id,
        content,
        post_id, 
        user_id,
        parent_comment_id,
        likes,
        number_of_likes,
        created_at,
        updated_at;
      `,
      [commentId, newContent]
    );

    const updatedComment = updateResult.rows[0];

    return res.status(200).json({
      success: true,
      message: "Comment updated successfully",
      comment: {
        id: updatedComment.id,
        content: updatedComment.content,
        postId: updatedComment.post_id,
        userId: updatedComment.user_id,
        parentCommentId: updatedComment.parent_comment_id,
        likes: updatedComment.likes,
        numberOfLikes: updatedComment.number_of_likes,
        createdAt: updatedComment.created_at,
        updatedAt: updatedComment.updated_at
      }
    });
  } catch (error) {
    console.error("Error editing comment:", error);
    return res.status(500).json({
      success: false,
      message: "Comment is not edited",
      error: error.message
    });
  }
};





/*export const likeComment = async (req, res) => {
  const userId    = parseInt(req.id, 10);           // ID of the logged-in user
  const commentId = parseInt(req.params.id, 10);    // ID of the comment to like/unlike

  try {
    // 1) Fetch the comment’s likes array & number_of_likes
    const fetchResult = await pool.query(
      `
      SELECT likes, number_of_likes
      FROM comments
      WHERE id = $1;
      `,
      [commentId]
    );

    if (fetchResult.rowCount === 0) {
      // No such comment → 404
      return res.status(404).json({
        success: false,
        message: "Comment not found"
      });
    }

    const { likes, number_of_likes } = fetchResult.rows[0];
    // likes is an integer array; number_of_likes is an integer

    // 2) Determine if userId is already in that array:
    const alreadyLiked = Array.isArray(likes) && likes.includes(userId);

    let updatedRow;

    if (alreadyLiked) {
      // 3A) User already liked → “unlike” (remove from array, decrement count)
      const updateResult = await pool.query(
        `
        UPDATE comments
        SET
          likes = array_remove(likes, $2),
          number_of_likes = GREATEST(number_of_likes - 1, 0),
          updated_at = NOW()
        WHERE id = $1
        RETURNING
          id,
          content,
          post_id,
          user_id,
          likes,
          number_of_likes,
          created_at,
          updated_at;
        `,
        [commentId, userId]
      );
      updatedRow = updateResult.rows[0];
    } else {
      // 3B) User not yet liked → “like” (append to array, increment count)
      const updateResult = await pool.query(
        `
        UPDATE comments
        SET
          likes = array_append(likes, $2),
          number_of_likes = number_of_likes + 1,
          updated_at = NOW()
        WHERE id = $1
        RETURNING
          id,
          content,
          post_id,
          user_id,
          likes,
          number_of_likes,
          created_at,
          updated_at;
        `,
        [commentId, userId]
      );
      updatedRow = updateResult.rows[0];
    }

    // 4) Respond with the updated comment
    return res.status(200).json({
      success: true,
      message: alreadyLiked ? "Comment unliked" : "Comment liked",
      updatedComment: updatedRow
    });
  } catch (error) {
    console.error("Error in likeComment:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while liking the comment",
      error: error.message
    });
  }
};

*/




export const likeComment = async (req, res) => {
  const userId    = parseInt(req.id, 10);           // ID of the logged‐in user
  const commentId = parseInt(req.params.id, 10);    // ID of the comment to like/unlike

  try {
    // 1) Fetch the comment’s likes array & number_of_likes
    const fetchResult = await pool.query(
      `
      SELECT likes, number_of_likes
      FROM comments
      WHERE id = $1;
      `,
      [commentId]
    );

    if (fetchResult.rowCount === 0) {
      // No such comment → 404
      return res.status(404).json({
        success: false,
        message: "Comment not found"
      });
    }

    const { likes, number_of_likes } = fetchResult.rows[0];
    const alreadyLiked = Array.isArray(likes) && likes.includes(userId);

    let updatedRow;
    if (alreadyLiked) {
      // 2A) Unlike: remove userId from likes, decrement count
      const updateResult = await pool.query(
        `
        UPDATE comments
        SET
          likes = array_remove(likes, $2),
          number_of_likes = GREATEST(number_of_likes - 1, 0),
          updated_at = NOW()
        WHERE id = $1
        RETURNING
          id,
          content,
          post_id           AS "postId",
          user_id           AS "userId",
          parent_comment_id AS "parentCommentId",
          likes,
          number_of_likes   AS "numberOfLikes",
          created_at        AS "createdAt",
          updated_at        AS "updatedAt";
        `,
        [commentId, userId]
      );
      updatedRow = updateResult.rows[0];
    } else {
      // 2B) Like: append userId to likes, increment count
      const updateResult = await pool.query(
        `
        UPDATE comments
        SET
          likes = array_append(likes, $2),
          number_of_likes = number_of_likes + 1,
          updated_at = NOW()
        WHERE id = $1
        RETURNING
          id,
          content,
          post_id           AS "postId",
          user_id           AS "userId",
          parent_comment_id AS "parentCommentId",
          likes,
          number_of_likes   AS "numberOfLikes",
          created_at        AS "createdAt",
          updated_at        AS "updatedAt";
        `,
        [commentId, userId]
      );
      updatedRow = updateResult.rows[0];
    }

    // 3) Respond with the updated comment (including parentCommentId)
    return res.status(200).json({
      success: true,
      message: alreadyLiked ? "Comment unliked" : "Comment liked",
      updatedComment: {
        id: updatedRow.id,
        content: updatedRow.content,
        postId: updatedRow.postId,
        userId: updatedRow.userId,
        parentCommentId: updatedRow.parentCommentId,
        likes: updatedRow.likes,
        numberOfLikes: updatedRow.numberOfLikes,
        createdAt: updatedRow.createdAt,
        updatedAt: updatedRow.updatedAt
      }
    });
  } catch (error) {
    console.error("Error in likeComment:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while liking the comment",
      error: error.message
    });
  }
};




/* export const getAllCommentsOnMyBlogs = async (req, res) => {
  const userId = parseInt(req.id, 10); // from your auth middleware

  try {
    // 1) Run the JOIN query; $1 = userId
    const { rows } = await pool.query(
      `
      SELECT
        c.id                  AS comment_id,
        c.content             AS content,
        c.post_id             AS post_id,
        b.title               AS post_title,
        c.user_id             AS commenter_id,
        u.first_name          AS commenter_first_name,
        u.last_name           AS commenter_last_name,
        u.email               AS commenter_email,
        c.created_at          AS created_at,
        c.updated_at          AS updated_at
      FROM comments c
      JOIN blogs b
        ON b.id = c.post_id
      JOIN users u
        ON u.id = c.user_id
      WHERE b.author_id = $1
      ORDER BY c.created_at DESC;
      `,
      [userId]
    );

    // 2) If no rows, return an empty array and zero count
    if (rows.length === 0) {
      return res.status(200).json({
        success: true,
        totalComments: 0,
        comments: [],
        message: "No comments found on any of your blogs."
      });
    }

    // 3) Map each row into the shape you want to return
    const comments = rows.map(r => ({
      id: r.comment_id,
      content: r.content,
      postId: r.post_id,
      postTitle: r.post_title,
      user: {
        id: r.commenter_id,
        firstName: r.commenter_first_name,
        lastName: r.commenter_last_name,
        email: r.commenter_email
      },
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));

    // 4) Return JSON
    return res.status(200).json({
      success: true,
      totalComments: comments.length,
      comments
    });
  } catch (error) {
    console.error("Error fetching comments on user's blogs:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get comments."
    });
  }
}; */



/* export const getAllCommentsOnMyBlogs = async (req, res) => {
  const userId = parseInt(req.id, 10); // from your auth middleware

  try {
    // 1) Fetch every comment on blogs where b.author_id = current user
    const { rows } = await pool.query(
      `
      SELECT
        c.id                       AS comment_id,
        c.content                  AS content,
        c.post_id                  AS post_id,
        b.title                    AS post_title,
        c.user_id                  AS commenter_id,
        u.first_name               AS commenter_first_name,
        u.last_name                AS commenter_last_name,
        u.photo_url                AS commenter_photo_url,
        c.parent_comment_id        AS parent_comment_id,
        c.created_at               AS created_at,
        c.updated_at               AS updated_at
      FROM comments c
      JOIN blog_comments bc
        ON bc.comment_id = c.id
      JOIN blogs b
        ON b.id = bc.blog_id
      JOIN users u
        ON u.id = c.user_id
      WHERE b.author_id = $1
      ORDER BY c.created_at DESC;
      `,
      [userId]
    );

    // 2) If no comments found, return empty array with totalComments = 0
    if (rows.length === 0) {
      return res.status(200).json({
        success: true,
        totalComments: 0,
        comments: [],
        message: "No comments found on your blogs."
      });
    }

    // 3) Map each row into your desired shape (including parentCommentId)
    const comments = rows.map(r => ({
      id: r.comment_id,
      content: r.content,
      postId: r.post_id,
      postTitle: r.post_title,
      user: {
        id: r.commenter_id,
        firstName: r.commenter_first_name,
        lastName: r.commenter_last_name,
        photoUrl: r.commenter_photo_url
      },
      parentCommentId: r.parent_comment_id,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));

    return res.status(200).json({
      success: true,
      totalComments: comments.length,
      comments
    });
  } catch (error) {
    console.error("Error in getAllCommentsOnMyBlogs:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch comments on your blogs"
    });
  }
};

*/



export const getAllCommentsOnMyBlogs = async (req, res) => {
  const userId = parseInt(req.id, 10);

  try {
    const { rows } = await pool.query(
      `
      SELECT
        c.id                       AS comment_id,
        c.content                  AS content,
        c.post_id                  AS post_id,
        b.title                    AS post_title,
        c.user_id                  AS commenter_id,
        u.first_name               AS commenter_first_name,
        u.last_name                AS commenter_last_name,
        u.photo_url                AS commenter_photo_url,
        c.parent_comment_id        AS parent_comment_id,
        c.likes                     AS likes,
        c.number_of_likes           AS number_of_likes,
        c.created_at               AS created_at,
        c.updated_at               AS updated_at
      FROM comments c
      JOIN blog_comments bc
        ON bc.comment_id = c.id
      JOIN blogs b
        ON b.id = bc.blog_id
      JOIN users u
        ON u.id = c.user_id
      WHERE b.author_id = $1
      ORDER BY c.created_at DESC;
      `,
      [userId]
    );

    if (rows.length === 0) {
      return res.status(200).json({
        success: true,
        totalComments: 0,
        comments: [],
        message: "No comments found on your blogs."
      });
    }

    const comments = rows.map((r) => ({
      id: r.comment_id,
      content: r.content,
      postId: r.post_id,
      postTitle: r.post_title,
      userId: r.commenter_id,              // <--- include userId
      user: {
        id: r.commenter_id,
        firstName: r.commenter_first_name,
        lastName: r.commenter_last_name,
        photoUrl: r.commenter_photo_url
      },
      parentCommentId: r.parent_comment_id,
      likes: r.likes || [],
      numberOfLikes: r.number_of_likes || 0,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));

    return res.status(200).json({
      success: true,
      totalComments: comments.length,
      comments
    });
  } catch (error) {
    console.error("Error in getAllCommentsOnMyBlogs:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch comments on your blogs"
    });
  }
};
