import { useEffect, useState } from "react";
import { Link, NavLink, Route, Routes } from "react-router-dom";
import { api, AUTH_CHANGED_EVENT, clearToken, getToken } from "./api.js";
import HomePage from "./pages/HomePage.jsx";
import CategoryPage from "./pages/CategoryPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import CartPage from "./pages/CartPage.jsx";
import OrdersPage from "./pages/OrdersPage.jsx";
import MyPage from "./pages/MyPage.jsx";
import MarketPage from "./pages/MarketPage.jsx";

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    let requestId = 0;
    async function refreshAuth() {
      const currentRequest = ++requestId;
      const token = getToken();
      if (!token) {
        setLoggedIn(false);
        return;
      }
      try {
        await api("/auth/me");
        if (currentRequest === requestId && getToken() === token) setLoggedIn(true);
      } catch {
        if (currentRequest === requestId && getToken() === token) {
          clearToken();
          setLoggedIn(false);
        }
      }
    }
    refreshAuth();
    window.addEventListener(AUTH_CHANGED_EVENT, refreshAuth);
    window.addEventListener("storage", refreshAuth);
    return () => {
      requestId++;
      window.removeEventListener(AUTH_CHANGED_EVENT, refreshAuth);
      window.removeEventListener("storage", refreshAuth);
    };
  }, []);

  return <div className="app-shell">
    <header className="topbar">
      <Link to="/" className="brand">제주잇 <small>제주eat</small></Link>
      <div className="top-actions">
        {loggedIn ? <NavLink to="/mypage">프로필</NavLink> : <NavLink to="/login">로그인</NavLink>}
        <NavLink to="/cart">장바구니</NavLink>
      </div>
    </header>
    <main className="page">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/category/:categoryId" element={<CategoryPage />} />
        <Route path="/market" element={<MarketPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/mypage" element={<MyPage />} />
        <Route path="*" element={<HomePage />} />
      </Routes>
    </main>
    <nav className="bottom-nav">
      <NavLink to="/">홈</NavLink><NavLink to="/cart">장바구니</NavLink><NavLink to="/orders">주문내역</NavLink><NavLink to="/mypage">마이페이지</NavLink>
    </nav>
  </div>;
}
