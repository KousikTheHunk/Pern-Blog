
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import getDataUri from "../utils/dataUri.js";
import cloudinary from "../utils/cloudinary.js";
import { pool } from "../database/db.js";


/* export const register = async (req, res) => {
    try {
        const { firstName, lastName, email,  password } = req.body;
        if (!firstName || !lastName || !email ||  !password) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            })
        }
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: "Invalid email"
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters"
            });
        }

        const existingUserByEmail = await User.findOne({ email: email });

        if (existingUserByEmail) {
            return res.status(400).json({ success: false, message: "Email already exists" });
        }

        // const existingUserByUsername = await User.findOne({ userName: userName });

        // if (existingUserByUsername) {
        //     return res.status(400).json({ success: false, message: "Username already exists" });
        // }

        const hashedPassword = await bcrypt.hash(password, 10);

        await User.create({
            firstName,
            lastName,
            email,
            password: hashedPassword
        })

        return res.status(201).json({
            success: true,
            message: "Account Created Successfully"
        })

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Failed to register"
        })

    }
}*/


export const register = async (req, res) => {
    try {
      const { firstName, lastName, email, password } = req.body;
  
      // 1) Validate required fields
      if (!firstName || !lastName || !email || !password) {
        return res.status(400).json({
          success: false,
          message: "All fields are required"
        });
      }
  
      // 2) Validate email format
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: "Invalid email"
        });
      }
  
      // 3) Validate password length
      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 6 characters"
        });
      }
  
      // 4) Check if an existing user already has this email
      const existingUserResult = await pool.query(
        `
        SELECT 1
        FROM users
        WHERE email = $1;
        `,
        [email]
      );
      if (existingUserResult.rowCount > 0) {
        // Email already exists
        return res.status(400).json({
          success: false,
          message: "Email already exists"
        });
      }
  
      // 5) Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);
  
      // 6) Insert the new user
      await pool.query(
        `
        INSERT INTO users (first_name, last_name, email, password)
        VALUES ($1, $2, $3, $4);
        `,
        [firstName, lastName, email, hashedPassword]
      );
  
      // 7) Return 201 Created
      return res.status(201).json({
        success: true,
        message: "Account Created Successfully"
      });
    } catch (error) {
      console.error("Error in register:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to register"
      });
    }
  
};



/* export const login = async(req, res) => {
    try {
        const {email,  password } = req.body;
        if (!email && !password) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            })
        }

        let user = await User.findOne({email});
        if(!user){
            return res.status(400).json({
                success:false,
                message:"Incorrect email or password"
            })
        }
       
        const isPasswordValid = await bcrypt.compare(password, user.password)
        if (!isPasswordValid) {
            return res.status(400).json({ 
                success: false, 
                message: "Invalid Credentials" 
            })
        }
        
        const token = await jwt.sign({userId:user._id}, process.env.SECRET_KEY, { expiresIn: '1d' })
        return res.status(200).cookie("token", token, { maxAge: 1 * 24 * 60 * 60 * 1000, httpsOnly: true, sameSite: "strict" }).json({
            success:true,
            message:`Welcome back ${user.firstName}`,
            user
        })
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Failed to Login",           
        })
    }
  
}*/



export const login = async (req, res) => {
    try {
      const { email, password } = req.body;
  
      // 1) Basic field check (replicating your original logic)
      if (!email && !password) {
        return res.status(400).json({
          success: false,
          message: "All fields are required"
        });
      }
  
      // 2) Fetch the user row by email from Postgres
      const userResult = await pool.query(
        `
        SELECT
          id,
          first_name,
          last_name,
          email,
          photo_url,
          bio,
          occupation,
          password   -- hashed password
        FROM users
        WHERE email = $1;
        `,
        [email]
      );
  
      if (userResult.rowCount === 0) {
        // No user with this email → Incorrect email or password
        return res.status(400).json({
          success: false,
          message: "Incorrect email or password"
        });
      }
  
      // 3) Extract the fetched user
      const userRow = userResult.rows[0];
      const hashedPassword = userRow.password; // from the database
  
      // 4) Compare submitted password with the hashed password
      const isPasswordValid = await bcrypt.compare(password, hashedPassword);
      if (!isPasswordValid) {
        return res.status(400).json({
          success: false,
          message: "Invalid Credentials"
        });
      }
  
      // 5) Generate a JWT (payload contains userId = id)
      const token = jwt.sign(
        { userId: userRow.id },
        process.env.SECRET_KEY,
        { expiresIn: "1d" }
      );
  
      // 6) Build a “safe” user object to return (omit the password)
      const safeUser = {
        id: userRow.id,
        firstName: userRow.first_name,
        lastName: userRow.last_name,
        email: userRow.email,
        photoUrl: userRow.photo_url,
        bio: userRow.bio,
        occupation: userRow.occupation
      };
  
      // 7) Set the cookie and respond
      return res
        .status(200)
        .cookie("token", token, {
          maxAge: 1 * 24 * 60 * 60 * 1000, // 1 day
          httpOnly: true,
          sameSite: "strict"
        })
        .json({
          success: true,
          message: `Welcome back ${userRow.first_name}`,
          user: safeUser
        });
    } catch (error) {
      console.error("Error in login:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to Login"
      });
    }
  
};




export const logout = async (_, res) => {
    try {
        return res.status(200).cookie("token", "", { maxAge: 0 }).json({
            message: "Logged out successfully.",
            success: true
        })
    } catch (error) {
        console.log(error);
    }
}



/*  export const updateProfile = async(req, res) => {
    try {
        const userId= req.id
        const {firstName, lastName, occupation, bio, instagram, facebook, linkedin, github} = req.body;
        const file = req.file;

        const fileUri = getDataUri(file)
        let cloudResponse = await cloudinary.uploader.upload(fileUri)

        const user = await User.findById(userId).select("-password")
        
        if(!user){
            return res.status(404).json({
                message:"User not found",
                success:false
            })
        }

        // updating data
        if(firstName) user.firstName = firstName
        if(lastName) user.lastName = lastName
        if(occupation) user.occupation = occupation
        if(instagram) user.instagram = instagram
        if(facebook) user.facebook = facebook
        if(linkedin) user.linkedin = linkedin
        if(github) user.github = github
        if(bio) user.bio = bio
        if(file) user.photoUrl = cloudResponse.secure_url

        await user.save()
        return res.status(200).json({
            message:"profile updated successfully",
            success:true,
            user
        })
        
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Failed to update profile"
        })
    }
}*/



export const updateProfile = async (req, res) => {
    try {
      const userId = parseInt(req.id, 10); // from your auth middleware
      const {
        firstName,
        lastName,
        occupation,
        bio,
        instagram,
        facebook,
        linkedin,
        github,
      } = req.body;
      const file = req.file; // multer‐parsed file, if provided
  
      // 1) (Optional) If no fields and no file were sent, we could early‐return “nothing to update.”
      //    But to mimic Mongoose’s behavior (which still updates updated_at), we’ll proceed.
  
      // 2) If there’s a new avatar file, upload to Cloudinary and get the secure_url
      let photoUrl;
      if (file) {
        const fileUri = getDataUri(file);
        const cloudResponse = await cloudinary.uploader.upload(fileUri);
        photoUrl = cloudResponse.secure_url;
      }
  
      // 3) Build a dynamic SET clause based on which fields were provided
      const setClauses = [];
      const values = [];
      let idx = 1;
  
      if (firstName) {
        setClauses.push(`first_name = $${idx}`);
        values.push(firstName);
        idx++;
      }
      if (lastName) {
        setClauses.push(`last_name = $${idx}`);
        values.push(lastName);
        idx++;
      }
      if (occupation) {
        setClauses.push(`occupation = $${idx}`);
        values.push(occupation);
        idx++;
      }
      if (instagram) {
        setClauses.push(`instagram = $${idx}`);
        values.push(instagram);
        idx++;
      }
      if (facebook) {
        setClauses.push(`facebook = $${idx}`);
        values.push(facebook);
        idx++;
      }
      if (linkedin) {
        setClauses.push(`linkedin = $${idx}`);
        values.push(linkedin);
        idx++;
      }
      if (github) {
        setClauses.push(`github = $${idx}`);
        values.push(github);
        idx++;
      }
      if (bio) {
        setClauses.push(`bio = $${idx}`);
        values.push(bio);
        idx++;
      }
      if (photoUrl) {
        setClauses.push(`photo_url = $${idx}`);
        values.push(photoUrl);
        idx++;
      }
  
      // If no updatable fields were provided, we still want to update updated_at
      if (setClauses.length === 0) {
        setClauses.push(`updated_at = NOW()`);
        // no value to push
      } else {
        // Always update updated_at as well
        setClauses.push(`updated_at = NOW()`);
      }
  
      // 4) Combine into a single SQL statement
      //    We’ll append “WHERE id = $n RETURNING *” at the end.
      const whereParamIdx = idx; // final parameter index for the WHERE clause
      values.push(userId);
  
      const updateQuery = `
        UPDATE users
        SET ${setClauses.join(", ")}
        WHERE id = $${whereParamIdx}
        RETURNING
          id,
          first_name,
          last_name,
          email,
          occupation,
          bio,
          instagram,
          facebook,
          linkedin,
          github,
          photo_url,
          created_at,
          updated_at;
      `;
  
      // 5) Execute the UPDATE. If no row is returned, the user didn’t exist → 404.
      const updateResult = await pool.query(updateQuery, values);
      if (updateResult.rowCount === 0) {
        return res.status(404).json({
          message: "User not found",
          success: false
        });
      }
  
      // 6) Map the returned row (snake_case columns) into camelCase for JSON response
      const row = updateResult.rows[0];
      const updatedUser = {
        id:        row.id,
        firstName: row.first_name,
        lastName:  row.last_name,
        email:     row.email,
        occupation: row.occupation,
        bio:        row.bio,
        instagram:  row.instagram,
        facebook:   row.facebook,
        linkedin:   row.linkedin,
        github:     row.github,
        photoUrl:   row.photo_url,
        createdAt:  row.created_at,
        updatedAt:  row.updated_at
      };
  
      return res.status(200).json({
        message: "Profile updated successfully",
        success: true,
        user: updatedUser
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to update profile"
      });
    }
  };



/*  export const getAllUsers = async (req, res) => {
    try {
      const users = await User.find().select('-password'); // exclude password field
      res.status(200).json({
        success: true,
        message: "User list fetched successfully",
        total: users.length,
        users
      });
    } catch (error) {
      console.error("Error fetching user list:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch users"
      });
    }
  }; */



  export const getAllUsers = async (req, res) => {
    try {
      // 1) Fetch all users, excluding the password column
      const { rows } = await pool.query(
        `
        SELECT
          id,
          first_name,
          last_name,
          email,
          bio,
          occupation,
          photo_url,
          instagram,
          linkedin,
          github,
          facebook,
          created_at,
          updated_at
        FROM users;
        `
      );
  
      // 2) Map each row from snake_case → camelCase
      const users = rows.map((row) => ({
        id: row.id,
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
        bio: row.bio,
        occupation: row.occupation,
        photoUrl: row.photo_url,
        instagram: row.instagram,
        linkedin: row.linkedin,
        github: row.github,
        facebook: row.facebook,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
  
      // 3) Return the response
      return res.status(200).json({
        success: true,
        message: "User list fetched successfully",
        total: users.length,
        users,
      });
    } catch (error) {
      console.error("Error fetching user list:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch users",
      });
    }
  };