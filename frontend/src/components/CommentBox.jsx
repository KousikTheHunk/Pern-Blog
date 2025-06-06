/* import React, { useEffect, useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { Textarea } from './ui/textarea'
import { FaHeart, FaRegHeart } from "react-icons/fa6";
// import { FaRegHeart, FaRegComment } from "react-icons/fa";
import { LuSend } from "react-icons/lu";
import { Button } from './ui/button';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';
import { toast } from 'sonner';
import { setBlog } from '@/redux/blogSlice';
import { setComment } from '@/redux/commentSlice';
import { Edit, Trash2 } from 'lucide-react';
import { BsThreeDots } from "react-icons/bs";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"


const CommentBox = ({ selectedBlog }) => {
    const { user } = useSelector(store => store.auth)
    const { comment } = useSelector(store => store.comment)
    const [content, setContent] = useState("")
    // const [replyComment, setReplyComment] = useState(false)
    const { blog } = useSelector(store => store.blog)
    const [activeReplyId, setActiveReplyId] = useState(null);
    const [replyText, setReplyText] = useState('');
    const [editingCommentId, setEditingCommentId] = useState(null);
    const [editedContent, setEditedContent] = useState('');

    const dispatch = useDispatch()

    const handleReplyClick = (commentId) => {
        setActiveReplyId(activeReplyId === commentId ? null : commentId);
        setReplyText('');
    };

    const changeEventHandler = (e) => {
        const inputText = e.target.value;
        if (inputText.trim()) {
            setContent(inputText)
        } else (
            setContent('')
        )
    }

    // console.log(selectedBlog);


    useEffect(() => {
        const getAllCommentsOfBlog = async () => {
            try {
                const res = await axios.get(`http://localhost:8000/api/v1/comment/${selectedBlog.id}/comment/all`)
                const data = res.data.comments
                dispatch(setComment(data))
            } catch (error) {
                console.log(error);

            }
        }
        getAllCommentsOfBlog()
    }, [])

    const commentHandler = async () => {
        try {
            const res = await axios.post(`http://localhost:8000/api/v1/comment/${selectedBlog.id}/create`, { content }, {
                headers: {
                    "Content-Type": "application/json"
                },
                withCredentials: true
            });
            if (res.data.success) {
                let updatedCommentData ;
                console.log(comment);

                if (comment.length >= 1) {
                    updatedCommentData = [...comment, res.data.comment]
                } else {
                    updatedCommentData = [res.data.comment]
                }
                dispatch(setComment(updatedCommentData))

                const updatedBlogData = blog.map(p =>
                    p.id === selectedBlog.id ? { ...p, comments: updatedCommentData } : p
                );
                dispatch(setBlog(updatedBlogData))
                toast.success(res.data.message)
                setContent("")
            }
        } catch (error) {
            console.log(error);
            toast.error("comment not added")

        }
    }

    const deleteComment = async (commentId) => {
        try {
            const res = await axios.delete(`http://localhost:8000/api/v1/comment/${commentId}/delete`, {
                withCredentials: true
            })
            if (res.data.success) {
                const updatedCommentData = comment.filter((item) => item.id !== commentId)
                console.log(updatedCommentData);

                dispatch(setComment(updatedCommentData))
                toast.success(res.data.message)
            }
        } catch (error) {
            console.log(error);
            toast.error("comment not deleted")

        }
    }

    const editCommentHandler = async (commentId) => {
        try {
            const res = await axios.put(
                `http://localhost:8000/api/v1/comment/${commentId}/edit`,
                { content: editedContent },
                {
                    withCredentials: true,
                    headers: {
                        "Content-Type": "application/json"
                    }
                }
            );

            if (res.data.success) {
                const updatedCommentData = comment.map(item =>
                    item.id === commentId ? { ...item, content: editedContent } : item
                );
                dispatch(setComment(updatedCommentData));
                toast.success(res.data.message);
                setEditingCommentId(null);
                setEditedContent('');
            }
        } catch (error) {
            console.log(error);
            toast.error("Failed to edit comment");
        }
    };

     const likeCommentHandler = async (commentId) => {
         try {
             const res = await axios.get(
                 `http://localhost:8000/api/v1/comment/${commentId}/like`,
                 {
                     withCredentials: true,
                 }
             );

             if (res.data.success) {
                 const updatedComment = res.data.updatedComment;

                 const updatedCommentList = comment.map(item =>
                     item.id === commentId ? updatedComment : item
                 );

                 dispatch(setComment(updatedCommentList));
                 toast.success(res.data.message)
             }
         } catch (error) {
             console.error("Error liking comment", error);
             toast.error("Something went wrong");
         }
     };


    return (
        <div>
            <div className='flex gap-4 mb-4 items-center'>
                <Avatar>
                    <AvatarImage src={user.photoUrl} />
                    <AvatarFallback>CN</AvatarFallback>
                </Avatar>
                <h3 className='font-semibold'>{user?.firstName} {user?.lastName}</h3>
            </div>
            <div className='flex gap-3'>
                <Textarea
                    placeholder="Leave a comment"
                    className="bg-gray-100 dark:bg-gray-800"
                    onChange={changeEventHandler}
                    value={content}
                />
                <Button onClick={commentHandler}><LuSend /></Button>
            </div>
            {
                comment.length > 0 ? <div className='mt-7 bg-gray-100 dark:bg-gray-800 p-5 rounded-md'>
                    {
                        comment.map((item, index) => {
                            return <div key={index} className='mb-4'>
                                <div className='flex items-center justify-between'>
                                    <div className='flex gap-3 items-start'>
                                        <Avatar>
                                            <AvatarImage src={item?.userId?.photoUrl} />
                                            <AvatarFallback>CN</AvatarFallback>
                                        </Avatar>
                                        <div className='mb-2 space-y-1 md:w-[400px]'>
                                            <h1 className='font-semibold'>{item?.userId?.firstName} {item?.userId?.lastName} <span className='text-sm ml-2 font-light'>yesterday</span></h1>
                                            {editingCommentId === item?.id ? (
                                                <>
                                                    <Textarea
                                                        value={editedContent}
                                                        onChange={(e) => setEditedContent(e.target.value)}
                                                        className="mb-2 bg-gray-200 dark:bg-gray-700"
                                                    />
                                                    <div className="flex py-1 gap-2">
                                                        <Button size="sm" onClick={() => editCommentHandler(item._id)}>Save</Button>
                                                        <Button size="sm" variant="outline" onClick={() => setEditingCommentId(null)}>Cancel</Button>
                                                    </div>
                                                </>
                                            ) : (
                                                <p className=''>{item?.content}</p>
                                            )}
                                            {/* <p className=''>{item.content}</p> }
                                            <div className='flex gap-5 items-center'>
                                                <div className='flex gap-2 items-center'>
                                                    <div
                                                        className='flex gap-1 items-center cursor-pointer'
                                                        onClick={() => likeCommentHandler(item.id)}
                                                    >
                                                        {
                                                            //item.likes.includes(user.id)
                                                            (Array.isArray(item.likes) ? item.likes : []).includes(user.id)
                                                                ? <FaHeart fill='red' />
                                                                : <FaRegHeart />
                                                        }
                                                        <span>{item.numberOfLikes}</span>
                                                    </div>

                                                </div>
                                                {/* <div className='flex gap-2 items-center'>
                                                <FaRegComment /> <span>5</span>
                                            </div> }
                                                <p onClick={() => handleReplyClick(item.id)} className='text-sm cursor-pointer'>Reply</p>


                                            </div>

                                        </div>
                                    </div>
                                    {/* <Button><Trash2/></Button> }
                                    {
                                        user._id === item?.userId?._id ? <DropdownMenu>
                                            <DropdownMenuTrigger><BsThreeDots /></DropdownMenuTrigger>
                                            <DropdownMenuContent className="w-[180px]">
                                                <DropdownMenuItem onClick={() => {
                                                    setEditingCommentId(item._id);
                                                    setEditedContent(item.content);
                                                }}><Edit />Edit</DropdownMenuItem>
                                                <DropdownMenuItem className="text-red-500" onClick={() => deleteComment(item._id)}><Trash2 />Delete</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu> : null
                                    }

                                </div>
                                {
                                    activeReplyId === item?.id &&
                                    <div className='flex gap-3 w-full px-10'>
                                        <Textarea
                                            placeholder="Reply here ..."
                                            className="border-2 dark:border-gray-500 bg-gray-200 dark:bg-gray-700"
                                            onChange={(e) => setReplyText(e.target.value)}
                                            value={replyText}
                                        />
                                        <Button onClick={commentHandler}><LuSend /></Button>
                                    </div>
                                }
                            </div>
                        })
                    }
                </div> : null
            }

        </div>
    )
}

export default CommentBox */





/*  import React, { useEffect, useState, useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Textarea } from "./ui/textarea";
import { FaHeart, FaRegHeart } from "react-icons/fa6";
import { LuSend } from "react-icons/lu";
import { Button } from "./ui/button";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import { toast } from "sonner";
import { setBlog } from "@/redux/blogSlice";
import { setComment } from "@/redux/commentSlice";
import { Edit, Trash2 } from "lucide-react";
import { BsThreeDots } from "react-icons/bs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const CommentBox = ({ selectedBlog }) => {
  const dispatch = useDispatch();
  const { user } = useSelector((store) => store.auth);

  // Pull the array out of state.comment.comment
  const flatComments = useSelector((store) => store.comment.comment) || [];
  const { blog } = useSelector((store) => store.blog);

  // For posting a top‐level comment
  const [content, setContent] = useState("");

  // For showing reply box under a specific comment
  const [activeReplyId, setActiveReplyId] = useState(null);
  const [replyText, setReplyText] = useState("");

  // For editing a comment
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editedContent, setEditedContent] = useState("");

  //
  // 1) Build a nested tree from flatComments
  //
  const nestedComments = useMemo(() => {
    if (!Array.isArray(flatComments)) return [];

    // 1.a) Create a map from comment.id → comment object (with empty .replies)
    const map = {};
    flatComments.forEach((c) => {
      map[c.id] = { ...c, replies: [] };
    });

    // 1.b) Collect top‐level comments; push each reply into its parent’s .replies
    const roots = [];
    flatComments.forEach((c) => {
      if (c.parentCommentId) {
        map[c.parentCommentId]?.replies.push(map[c.id]);
      } else {
        roots.push(map[c.id]);
      }
    });

    // 1.c) Optionally sort each level by createdAt descending
    const sortRecursively = (arr) => {
      arr.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      arr.forEach((child) => {
        if (child.replies.length > 0) sortRecursively(child.replies);
      });
    };
    sortRecursively(roots);

    return roots;
  }, [flatComments]);

  //
  // 2) Fetch all comments for the current blog (flat array) on mount
  //
  useEffect(() => {
    const getAllCommentsOfBlog = async () => {
      try {
        const res = await axios.get(
          `http://localhost:8000/api/v1/comment/${selectedBlog.id}/comment/all`,
          { withCredentials: true }
        );
        if (res.data.success) {
          // setComment expects an array
          dispatch(setComment(res.data.comments));
        }
      } catch (error) {
        console.error("Error fetching comments:", error);
      }
    };
    getAllCommentsOfBlog();
  }, [dispatch, selectedBlog.id]);

  //
  // 3) Post a new top‐level comment
  //
  const commentHandler = async () => {
    if (!content.trim()) return;
    try {
      const res = await axios.post(
        `http://localhost:8000/api/v1/comment/${selectedBlog.id}/create`,
        { content },
        {
          headers: { "Content-Type": "application/json" },
          withCredentials: true,
        }
      );
      if (res.data.success) {
        const newComment = res.data.comment;
        dispatch(setComment([...flatComments, newComment]));

        // Update this blog’s comment list in Redux store.blog
        const updatedBlogData = blog.map((b) =>
          b.id === selectedBlog.id
            ? { ...b, comments: [...(b.comments || []), newComment] }
            : b
        );
        dispatch(setBlog(updatedBlogData));

        toast.success(res.data.message);
        setContent("");
      }
    } catch (error) {
      console.error("Error adding comment:", error);
      toast.error("Comment not added");
    }
  };

  //
  // 4) Post a reply to an existing comment
  //
  const replyHandler = async (parentCommentId) => {
    if (!replyText.trim()) return;
    try {
      const res = await axios.post(
        `http://localhost:8000/api/v1/comment/${selectedBlog.id}/create`,
        { content: replyText, parentCommentId },
        {
          headers: { "Content-Type": "application/json" },
          withCredentials: true,
        }
      );
      if (res.data.success) {
        const newReply = res.data.comment;
        dispatch(setComment([...flatComments, newReply]));
        toast.success("Reply added");

        // Close the reply box
        setActiveReplyId(null);
        setReplyText("");
      }
    } catch (error) {
      console.error("Error adding reply:", error);
      toast.error("Reply not added");
    }
  };

  //
  // 5) Delete a comment or reply (cascade deletes its descendants)
  //
  const deleteComment = async (commentId) => {
    try {
      const res = await axios.delete(
        `http://localhost:8000/api/v1/comment/${commentId}/delete`,
        { withCredentials: true }
      );
      if (res.data.success) {
        // Filter out the deleted comment; cascade already removed descendants in DB
        const updatedFlat = flatComments.filter((c) => c.id !== commentId);
        dispatch(setComment(updatedFlat));
        toast.success(res.data.message);
      }
    } catch (error) {
      console.error("Error deleting comment:", error);
      toast.error("Comment not deleted");
    }
  };

  //
  // 6) Edit a comment or reply
  //
  const editCommentHandler = async (commentId) => {
    if (!editedContent.trim()) return;
    try {
      const res = await axios.put(
        `http://localhost:8000/api/v1/comment/${commentId}/edit`,
        { content: editedContent },
        {
          withCredentials: true,
          headers: { "Content-Type": "application/json" },
        }
      );
      if (res.data.success) {
        // The server returns only { id, content, postId, userId, parentCommentId, likes, numberOfLikes, createdAt, updatedAt }
        const updatedComment = res.data.comment;
        // Merge the existing `user` field back in:
        const updatedFlat = flatComments.map((c) =>
          c.id === commentId
            ? { 
                ...updatedComment,
                user: c.user 
              }
            : c
        );
  
        dispatch(setComment(updatedFlat));
        toast.success(res.data.message);
        setEditingCommentId(null);
        setEditedContent("");
      }
    } catch (error) {
      console.error("Error editing comment:", error);
      toast.error("Failed to edit comment");
    }
  };
  

  //
  // 7) Like/unlike a comment or reply
  //
  const likeCommentHandler = async (commentId) => {
    try {
      const res = await axios.get(
        `http://localhost:8000/api/v1/comment/${commentId}/like`,
        { withCredentials: true }
      );
      if (res.data.success) {
        const updatedComment = res.data.updatedComment;
  
        // Merge the existing `user` field back into the updated comment:
        const updatedFlat = flatComments.map((c) =>
          c.id === commentId
            ? { 
                ...updatedComment,
                user: c.user 
              }
            : c
        );
  
        dispatch(setComment(updatedFlat));
        toast.success(res.data.message);
      }
    } catch (error) {
      console.error("Error liking comment:", error);
      toast.error("Something went wrong");
    }
  };
  

  //
  // 8) Recursively render a comment and its replies (indented by depth)
  //
  const renderCommentRecursively = (commentObj, depth = 0) => {
    // Use optional chaining to avoid reading .user when undefined
    const commenterPhoto = commentObj.user?.photoUrl || "";
    const commenterFirst = commentObj.user?.firstName || "Unknown";
    const commenterLast = commentObj.user?.lastName || "";

    return (
      <div
        key={commentObj.id}
        className="mb-4"
        style={{ marginLeft: depth * 24 }}
      >
        <div className="flex items-start justify-between">
          <div className="flex gap-3 items-start">
            <Avatar>
              {commenterPhoto ? (
                <AvatarImage src={commenterPhoto} />
              ) : (
                <AvatarFallback>U</AvatarFallback>
              )}
            </Avatar>
            <div className="mb-2 space-y-1 md:w-[400px]">
              <h1 className="font-semibold">
                {commenterFirst} {commenterLast}{" "}
                <span className="text-sm ml-2 font-light">yesterday</span>
              </h1>

              {editingCommentId === commentObj.id ? (
                <>
                  <Textarea
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    className="mb-2 bg-gray-200 dark:bg-gray-700"
                  />
                  <div className="flex py-1 gap-2">
                    <Button
                      size="sm"
                      onClick={() => editCommentHandler(commentObj.id)}
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingCommentId(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </>
              ) : (
                <p>{commentObj.content}</p>
              )}

              <div className="flex gap-5 items-center">
                <div className="flex gap-2 items-center">
                  <div
                    className="flex gap-1 items-center cursor-pointer"
                    onClick={() => likeCommentHandler(commentObj.id)}
                  >
                    {Array.isArray(commentObj.likes) &&
                    commentObj.likes.includes(user.id) ? (
                      <FaHeart fill="red" />
                    ) : (
                      <FaRegHeart />
                    )}
                    <span>{commentObj.numberOfLikes}</span>
                  </div>
                </div>
                <p
                  onClick={() => {
                    setActiveReplyId(
                      activeReplyId === commentObj.id ? null : commentObj.id
                    );
                    setReplyText("");
                  }}
                  className="text-sm cursor-pointer"
                >
                  Reply
                </p>
              </div>
            </div>
          </div>

          {user.id === commentObj.userId ? (
            <DropdownMenu>
              <DropdownMenuTrigger>
                <BsThreeDots />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[180px]">
                <DropdownMenuItem
                  onClick={() => {
                    setEditingCommentId(commentObj.id);
                    setEditedContent(commentObj.content);
                  }}
                >
                  <Edit /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-red-500"
                  onClick={() => deleteComment(commentObj.id)}
                >
                  <Trash2 /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>

        {activeReplyId === commentObj.id && (
          <div className="flex gap-3 w-full px-10 mt-2">
            <Textarea
              placeholder="Reply here..."
              className="border-2 dark:border-gray-500 bg-gray-200 dark:bg-gray-700"
              onChange={(e) => setReplyText(e.target.value)}
              value={replyText}
            />
            <Button onClick={() => replyHandler(commentObj.id)}>
              <LuSend />
            </Button>
          </div>
        )}

        {commentObj.replies.length > 0 &&
          commentObj.replies.map((child) =>
            renderCommentRecursively(child, depth + 1)
          )}
      </div>
    );
  };

  return (
    <div>
      {/* Top‐level comment box }
      <div className="flex gap-4 mb-4 items-center">
        <Avatar>
          <AvatarImage src={user.photoUrl} />
          <AvatarFallback>CN</AvatarFallback>
        </Avatar>
        <h3 className="font-semibold">
          {user.firstName} {user.lastName}
        </h3>
      </div>
      <div className="flex gap-3 mb-6">
        <Textarea
          placeholder="Leave a comment"
          className="bg-gray-100 dark:bg-gray-800"
          onChange={(e) =>
            setContent(e.target.value.trim() ? e.target.value : "")
          }
          value={content}
        />
        <Button onClick={commentHandler}>
          <LuSend />
        </Button>
      </div>

      {/* Nested comment tree }
      {nestedComments.length > 0 ? (
        <div className="bg-gray-100 dark:bg-gray-800 p-5 rounded-md">
          {nestedComments.map((c) => renderCommentRecursively(c, 0))}
        </div>
      ) : (
        <p className="text-gray-500">
          No comments yet. Be the first to comment!
        </p>
      )}
    </div>
  );
};

export default CommentBox;   */



// src/components/CommentBox.jsx
import React, { useEffect, useState, useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Textarea } from "./ui/textarea";
import { FaHeart, FaRegHeart } from "react-icons/fa6";
import { LuSend } from "react-icons/lu";
import { Button } from "./ui/button";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import { toast } from "sonner";
import { setBlog } from "@/redux/blogSlice";
import { setComment } from "@/redux/commentSlice";
import { Edit, Trash2 } from "lucide-react";
import { BsThreeDots } from "react-icons/bs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const CommentBox = ({ selectedBlog }) => {
  const dispatch = useDispatch();
  // If store.auth.user is undefined, fall back to an object with id=null
  const authUser = useSelector((store) => store.auth.user) || { id: null, firstName: "", lastName: "", photoUrl: "" };

  // pull the flat array from state.comment.comment (or empty array)
  const flatComments = useSelector((store) => store.comment.comment) || [];
  const { blog } = useSelector((store) => store.blog);

  // FOR POSTING A TOP-LEVEL COMMENT
  const [content, setContent] = useState("");

  // FOR SHOWING A REPLY BOX UNDER A SPECIFIC COMMENT
  const [activeReplyId, setActiveReplyId] = useState(null);
  const [replyText, setReplyText] = useState("");

  // FOR EDITING A COMMENT
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editedContent, setEditedContent] = useState("");

  //
  // 1) Build a nested tree from flatComments
  //
  const nestedComments = useMemo(() => {
    if (!Array.isArray(flatComments)) return [];

    // map each comment.id → { …comment, replies: [] }
    const map = {};
    flatComments.forEach((c) => {
      map[c.id] = { ...c, replies: [] };
    });

    const roots = [];
    flatComments.forEach((c) => {
      if (c.parentCommentId) {
        // if it's a reply, append to the parent’s replies
        map[c.parentCommentId]?.replies.push(map[c.id]);
      } else {
        // otherwise it's a top-level comment
        roots.push(map[c.id]);
      }
    });

    const sortRecursively = (arr) => {
      arr.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      arr.forEach((child) => {
        if (child.replies.length > 0) sortRecursively(child.replies);
      });
    };
    sortRecursively(roots);

    return roots;
  }, [flatComments]);

  //
  // 2) Fetch all comments for this blog on mount
  //
  useEffect(() => {
    const getAllCommentsOfBlog = async () => {
      try {
        const res = await axios.get(
          `http://localhost:8000/api/v1/comment/${selectedBlog.id}/comment/all`,
          { withCredentials: true }
        );
        if (res.data.success) {
          dispatch(setComment(res.data.comments));
        }
      } catch (error) {
        console.error("Error fetching comments:", error);
      }
    };
    getAllCommentsOfBlog();
  }, [dispatch, selectedBlog.id]);

  //
  // 3) Post a new top-level comment
  //
  const commentHandler = async () => {
    if (!content.trim()) return;
    try {
      const res = await axios.post(
        `http://localhost:8000/api/v1/comment/${selectedBlog.id}/create`,
        { content },
        {
          headers: { "Content-Type": "application/json" },
          withCredentials: true,
        }
      );
      if (res.data.success) {
        const newComment = res.data.comment;
        dispatch(setComment([...flatComments, newComment]));

        // Update Redux blog slice so UI updates optimistically
        const updatedBlogData = blog.map((b) =>
          b.id === selectedBlog.id
            ? { ...b, comments: [...(b.comments || []), newComment] }
            : b
        );
        dispatch(setBlog(updatedBlogData));

        toast.success(res.data.message);
        setContent("");
      }
    } catch (error) {
      console.error("Error adding comment:", error);
      toast.error("Comment not added");
    }
  };

  //
  // 4) Post a reply to an existing comment
  //
  const replyHandler = async (parentCommentId) => {
    if (!replyText.trim()) return;
    try {
      const res = await axios.post(
        `http://localhost:8000/api/v1/comment/${selectedBlog.id}/create`,
        { content: replyText, parentCommentId },
        {
          headers: { "Content-Type": "application/json" },
          withCredentials: true,
        }
      );
      if (res.data.success) {
        const newReply = res.data.comment;
        dispatch(setComment([...flatComments, newReply]));
        toast.success("Reply added");
        setActiveReplyId(null);
        setReplyText("");
      }
    } catch (error) {
      console.error("Error adding reply:", error);
      toast.error("Reply not added");
    }
  };

  //
  // 5) Delete a comment or reply (cascade deletes descendants)
  //
  const deleteComment = async (commentId) => {
    try {
      const res = await axios.delete(
        `http://localhost:8000/api/v1/comment/${commentId}/delete`,
        { withCredentials: true }
      );
      if (res.data.success) {
        const updatedFlat = flatComments.filter((c) => c.id !== commentId);
        dispatch(setComment(updatedFlat));
        toast.success(res.data.message);
      }
    } catch (error) {
      console.error("Error deleting comment:", error);
      toast.error("Comment not deleted");
    }
  };

  //
  // 6) Edit a comment or reply
  //
  const editCommentHandler = async (commentId) => {
    if (!editedContent.trim()) return;
    try {
      const res = await axios.put(
        `http://localhost:8000/api/v1/comment/${commentId}/edit`,
        { content: editedContent },
        {
          withCredentials: true,
          headers: { "Content-Type": "application/json" },
        }
      );
      if (res.data.success) {
        const updatedComment = res.data.comment;
        const updatedFlat = flatComments.map((c) =>
          c.id === commentId ? { ...updatedComment, user: c.user } : c
        );
        dispatch(setComment(updatedFlat));
        toast.success(res.data.message);
        setEditingCommentId(null);
        setEditedContent("");
      }
    } catch (error) {
      console.error("Error editing comment:", error);
      toast.error("Failed to edit comment");
    }
  };

  //
  // 7) Like/unlike a comment or reply
  //
  const likeCommentHandler = async (commentId) => {
    try {
      const res = await axios.get(
        `http://localhost:8000/api/v1/comment/${commentId}/like`,
        { withCredentials: true }
      );
      if (res.data.success) {
        const updatedComment = res.data.updatedComment;
        const updatedFlat = flatComments.map((c) =>
          c.id === commentId ? { ...updatedComment, user: c.user } : c
        );
        dispatch(setComment(updatedFlat));
        toast.success(res.data.message);
      }
    } catch (error) {
      console.error("Error liking comment:", error);
      toast.error("Something went wrong");
    }
  };

  //
  // 8) Recursively render a comment and its replies
  //
  const renderCommentRecursively = (commentObj, depth = 0) => {
    // optional chaining: if user is missing, fallback values
    const commenterPhoto = commentObj.user?.photoUrl || "";
    const commenterFirst = commentObj.user?.firstName || "Unknown";
    const commenterLast = commentObj.user?.lastName || "";

    return (
      <div
        key={commentObj.id}
        className="mb-4"
        style={{ marginLeft: depth * 24 }}
      >
        <div className="flex items-start justify-between">
          <div className="flex gap-3 items-start">
            <Avatar>
              {commenterPhoto ? (
                <AvatarImage src={commenterPhoto} />
              ) : (
                <AvatarFallback>U</AvatarFallback>
              )}
            </Avatar>
            <div className="mb-2 space-y-1 md:w-[400px]">
              <h1 className="font-semibold">
                {commenterFirst} {commenterLast}{" "}
                <span className="text-sm ml-2 font-light">yesterday</span>
              </h1>

              {editingCommentId === commentObj.id ? (
                <>
                  <Textarea
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    className="mb-2 bg-gray-200 dark:bg-gray-700"
                  />
                  <div className="flex py-1 gap-2">
                    <Button
                      size="sm"
                      onClick={() => editCommentHandler(commentObj.id)}
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingCommentId(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </>
              ) : (
                <p>{commentObj.content}</p>
              )}

              <div className="flex gap-5 items-center">
                <div className="flex gap-2 items-center">
                  <div
                    className="flex gap-1 items-center cursor-pointer"
                    onClick={() => likeCommentHandler(commentObj.id)}
                  >
                    {Array.isArray(commentObj.likes) &&
                    commentObj.likes.includes(authUser.id) ? (
                      <FaHeart fill="red" />
                    ) : (
                      <FaRegHeart />
                    )}
                    <span>{commentObj.numberOfLikes}</span>
                  </div>
                </div>
                <p
                  onClick={() => {
                    setActiveReplyId(
                      activeReplyId === commentObj.id ? null : commentObj.id
                    );
                    setReplyText("");
                  }}
                  className="text-sm cursor-pointer"
                >
                  Reply
                </p>
              </div>
            </div>
          </div>

          {/* Show Edit/Delete only if the current user matches commentObj.userId */}
          {authUser.id === commentObj.userId ? (
            <DropdownMenu>
              <DropdownMenuTrigger>
                <BsThreeDots />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[180px]">
                <DropdownMenuItem
                  onClick={() => {
                    setEditingCommentId(commentObj.id);
                    setEditedContent(commentObj.content);
                  }}
                >
                  <Edit /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-red-500"
                  onClick={() => deleteComment(commentObj.id)}
                >
                  <Trash2 /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>

        {activeReplyId === commentObj.id && (
          <div className="flex gap-3 w-full px-10 mt-2">
            <Textarea
              placeholder="Reply here..."
              className="border-2 dark:border-gray-500 bg-gray-200 dark:bg-gray-700"
              onChange={(e) => setReplyText(e.target.value)}
              value={replyText}
            />
            <Button onClick={() => replyHandler(commentObj.id)}>
              <LuSend />
            </Button>
          </div>
        )}

        {commentObj.replies.length > 0 &&
          commentObj.replies.map((child) =>
            renderCommentRecursively(child, depth + 1)
          )}
      </div>
    );
  };

  return (
    <div>
      {/* Top-level comment box */}
      <div className="flex gap-4 mb-4 items-center">
        <Avatar>
          {authUser.photoUrl ? (
            <AvatarImage src={authUser.photoUrl} />
          ) : (
            <AvatarFallback>CN</AvatarFallback>
          )}
        </Avatar>
        <h3 className="font-semibold">
          {authUser.firstName} {authUser.lastName}
        </h3>
      </div>
      <div className="flex gap-3 mb-6">
        <Textarea
          placeholder="Leave a comment"
          className="bg-gray-100 dark:bg-gray-800"
          onChange={(e) =>
            setContent(e.target.value.trim() ? e.target.value : "")
          }
          value={content}
        />
        <Button onClick={commentHandler}>
          <LuSend />
        </Button>
      </div>

      {/* Nested comment tree */}
      {nestedComments.length > 0 ? (
        <div className="bg-gray-100 dark:bg-gray-800 p-5 rounded-md">
          {nestedComments.map((c) => renderCommentRecursively(c, 0))}
        </div>
      ) : (
        <p className="text-gray-500">
          No comments yet. Be the first to comment!
        </p>
      )}
    </div>
  );
};

export default CommentBox;






