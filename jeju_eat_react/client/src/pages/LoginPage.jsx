import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, saveToken } from "../api.js";
export default function LoginPage() {
  const [mode,setMode]=useState("login"),[name,setName]=useState(""),[email,setEmail]=useState(""),[password,setPassword]=useState(""),[message,setMessage]=useState("");
  const navigate=useNavigate();
  async function submit(e){e.preventDefault();setMessage("");try{const data=await api("/auth/"+mode,{method:"POST",body:JSON.stringify({name,email,password})});saveToken(data.token);navigate("/mypage");}catch(err){setMessage(err.message);}}
  return <section className="form-panel"><p className="eyebrow">JEJU EAT ACCOUNT</p><h1>{mode==="login"?"로그인":"회원가입"}</h1><div className="tabs"><button className={mode==="login"?"selected":""} onClick={()=>setMode("login")}>로그인</button><button className={mode==="signup"?"selected":""} onClick={()=>setMode("signup")}>회원가입</button></div><form onSubmit={submit}>{mode==="signup"&&<label>이름<input required value={name} onChange={e=>setName(e.target.value)} placeholder="이름"/></label>}<label>이메일<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="email@example.com"/></label><label>비밀번호<input type="password" required minLength="8" value={password} onChange={e=>setPassword(e.target.value)} placeholder="8자 이상"/></label><button className="wide"> {mode==="login"?"로그인":"회원가입"} </button></form>{message&&<p className="error">{message}</p>}<p className="helper">회원가입과 로그인은 Express 인증 API를 호출합니다.</p></section>;
}
