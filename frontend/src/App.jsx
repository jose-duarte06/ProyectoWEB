import { Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Admin from "./pages/Admin.jsx";
import { useAuth } from "./context/AuthContext.jsx";
import ProductList from "./pages/ProductList.jsx";
import ProductDetail from "./pages/ProductDetail.jsx";
import Cart from "./pages/Cart.jsx";
import Checkout from "./pages/Checkout.jsx";
import Orders from "./pages/Orders.jsx";
import Support from "./pages/Support.jsx";
import VerifyEmail from "./pages/VerifyEmail.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";


function Protected({ children, role }) {
  const { user, ready } = useAuth();
  if (!ready) return <p style={{padding:16}}>Cargando...</p>;
  if (!user) return <Navigate to="/" replace />;
  if (role && user.rol !== role) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <>
      <Navbar />
      <div style={{ padding: "16px" }}>
        <Routes>
          <Route
            path="/pedidos"
            element={
              <Protected>
                <Orders />
              </Protected>
            }
          />
          <Route path="/" element={<Login />} />
          
          <Route path="/registro" element={<Register />} />
          <Route path="/productos" element={<ProductList />}/>
          <Route path="/productos/:id" element={<ProductDetail />}/>
          <Route path="/carrito" element={<Cart/>} />
          <Route path="/checkout" element={<Checkout/>}/>
          
          <Route
            path="/pedidos" element={
              <Protected>
                <Orders>
                </Orders>
              </Protected>
            }>

          </Route>
          <Route
            path="/admin"
            element={
              <Protected role="administrador">
                <Admin />
              </Protected>
            }
          />
          <Route
            path="/support"
            element={
              <Protected>
                <Support />
              </Protected>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
          <Route path="/verificar" element={<VerifyEmail />} />
          
          <Route path="/olvide" element={<ForgotPassword />} />
        </Routes>
      </div>
    </>
  );
}

