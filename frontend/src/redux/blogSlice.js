import {createSlice} from "@reduxjs/toolkit"


const initialState ={
    blog:[],
    yourBlog:[]
}

const blogSlice = createSlice({
    name:"blog",
    initialState,
    reducers:{
        //actions
        setBlog:(state, action) => {
            state.blog = action.payload;
            
        },
        setYourBlog:(state, action) => {
            state.yourBlog = action.payload;
        },
        clearBlog : (state) => {
            state.blog = [];
            state.yourBlog = [];
          },

    }
});

export const {setBlog, setYourBlog , clearBlog } = blogSlice.actions;
export default blogSlice.reducer;