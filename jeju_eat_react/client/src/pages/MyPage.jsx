import {useEffect,useState} from "react";
import {Link,useNavigate} from "react-router-dom";
import {api,clearToken,getToken} from "../api.js";
export default function MyPage(){const[user,setUser]=useState(null),[message,setMessage]=useState("");const navigate=useNavigate();useEffect(()=>{if(!getToken()){setMessage("로그인이 필요합니다.");return;}api("/auth/me").then(d=>setUser(d.user)).catch(e=>setMessage(e.message));},[]);function logout(){clearToken();navigate("/");}return <section><p className="eyebrow">MY JEJU EAT</p><h1>마이페이지</h1>{user?<div className="profile-card"><div className="avatar">👤</div><h2>{user.name}</h2><p>{user.email}</p><button onClick={logout}>로그아웃</button></div>:<p className="notice">{message} <Link to="/login">로그인하기</Link></p>}</section>;}
