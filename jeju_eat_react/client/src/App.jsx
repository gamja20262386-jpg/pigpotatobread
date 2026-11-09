import { Link, NavLink, Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage.jsx";
import CategoryPage from "./pages/CategoryPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import CartPage from "./pages/CartPage.jsx";
import OrdersPage from "./pages/OrdersPage.jsx";
import MyPage from "./pages/MyPage.jsx";

export default function App() {
  return <div className="app-shell">
    <header className="topbar">
      <Link to="/" className="brand">제주잇 <small>제주eat</small></Link>
      <div className="top-actions"><NavLink to="/login">로그인</NavLink><NavLink to="/cart">장바구니</NavLink></div>
    </header>
    <main className="page">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/category/:categoryId" element={<CategoryPage />} />
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
