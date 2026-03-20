import React, { useState } from "react";
import axios from "axios";

const API = "http://localhost:5000/api";

function AdminHoliday() {

  const [title,setTitle] = useState("");
  const [description,setDescription] = useState("");
  const [date,setDate] = useState("");

  const handleSubmit = async(e)=>{
    e.preventDefault();

    await axios.post(`${API}/add-holiday`,{
      title,
      description,
      holiday_date:date
    });

    alert("Holiday Added");
  }

  return(
    <div>
      <h2>Add Holiday</h2>

      <form onSubmit={handleSubmit}>
        
        <input
        placeholder="Holiday title"
        value={title}
        onChange={(e)=>setTitle(e.target.value)}
        />

        <input
        type="date"
        value={date}
        onChange={(e)=>setDate(e.target.value)}
        />

        <textarea
        placeholder="Description"
        value={description}
        onChange={(e)=>setDescription(e.target.value)}
        />

        <button type="submit">
          Add Holiday
        </button>

      </form>
    </div>
  )
}

export default AdminHoliday;