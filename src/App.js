import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import io from "socket.io-client";
import {
  Box,
  Typography,
  IconButton,
  Button,
  TextField,
  CircularProgress,
  Alert,
  Card,
  CardContent,
} from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import CurrencyBar from "./CurrencyBar";
import api, { settingsService, getTenantId } from "./services/api";
import { useAuth } from "./context/AuthContext";

// Backend URL configuration
const getBackendUrl = () => {
  if (process.env.REACT_APP_BACKEND_URL) {
    return process.env.REACT_APP_BACKEND_URL;
  }
  return "https://apiharem.kuyumcufatih.com";
};

const BACKEND_URL = getBackendUrl();

function App() {
  const [hesaplananFiyat, setHesaplananFiyat] = useState(() => {
    const saved = localStorage.getItem("hesaplananFiyat");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed;
      } catch (e) {}
    }
    return [];
  });
  const [goldPrice, setGoldPrice] = useState(null);
  const [silverPrice, setSilverPrice] = useState(() => {
    const saved = localStorage.getItem("silverPrice");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return { key: "Gümüş", buy: "0", sell: "0", percent: "0", arrow: "up" };
  });
  const [onsPrice, setOnsPrice] = useState(() => {
    const saved = localStorage.getItem("onsPrice");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return { key: "ONS", buy: "0", sell: "0", percent: "0", arrow: "up" };
  });
  const [currencyRates, setCurrencyRates] = useState(() => {
    const saved = localStorage.getItem("currencyRates");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed;
      } catch (e) {}
    }
    // Return default values only if nothing is saved
    const defaults = [
      { key: "USD", buy: "32.50", sell: "32.80", percent: "0.00", arrow: "up" },
      { key: "EUR", buy: "35.75", sell: "36.10", percent: "0.00", arrow: "up" },
      { key: "GBP", buy: "41.20", sell: "41.60", percent: "0.00", arrow: "up" },
    ];
    return defaults;
  });
  const [lastDataTime, setLastDataTime] = useState(null);

  const formatNumber = (number, { decimals } = {}) => {
    const fractionDigits = decimals ?? 0;
    return new Intl.NumberFormat("tr-TR", {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(number);
  };

  // Helper to merge new currency rates with previous ones, preserving old values
  const mergeCurrencyRates = (previousRates, newRates) => {
    if (!Array.isArray(newRates) || newRates.length === 0) {
      return previousRates || [];
    }

    const prevArray = Array.isArray(previousRates) ? previousRates : [];
    const rateMap = new Map(prevArray.map((rate) => [rate.key, rate]));

    newRates.forEach((rate) => {
      if (!rate || !rate.key) return;

      const existing = rateMap.get(rate.key) || {};
      // Merge to keep any old fields that might not come in the new payload
      rateMap.set(rate.key, { ...existing, ...rate });
    });

    return Array.from(rateMap.values());
  };

  const [products, setProducts] = useState([]);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  const [calculatedPrices, setCalculatedPrices] = useState([]);
  
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const navigate = useNavigate();
  const { isAdmin, isAuthenticated, logout, admin, login, loading: authLoading } = useAuth();

  const handleLogout = () => {
    logout();
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);
    try {
      await login(loginUsername, loginPassword);
      setLoginUsername("");
      setLoginPassword("");
    } catch (err) {
      setLoginError(err.response?.data?.error || "Giriş başarısız");
    } finally {
      setLoginLoading(false);
    }
  };
  
  const handleCalculatePrices = useCallback(async () => {
    try {
      const response = await api.post(`/bracelet-price`, { products });

      const hesaplananData = response.data.hesaplanan || [];
      setHesaplananFiyat(hesaplananData);
      setCalculatedPrices(hesaplananData);

      localStorage.setItem("hesaplananFiyat", JSON.stringify(hesaplananData));
      localStorage.setItem("calculatedPrices", JSON.stringify(hesaplananData));
    } catch (error) {
      console.error("Error calculating prices:", error);
    }
  }, [products]);

  // Fetch settings from API after login
  useEffect(() => {
    if (!isAuthenticated) {
      setSettingsLoaded(false);
      return;
    }
    localStorage.removeItem("hesaplananFiyat");
    localStorage.removeItem("calculatedPrices");
    setHesaplananFiyat([]);
    setCalculatedPrices([]);

    const fetchSettings = async () => {
      try {
        const response = await settingsService.getSettings();
        if (response.success && response.settings) {
          const s = response.settings;
          if (s.products && Array.isArray(s.products)) {
            setProducts(s.products);
          }
          setSettingsLoaded(true);
        }
      } catch (error) {
        console.error("Failed to fetch settings:", error);
        setSettingsLoaded(true);
      }
    };
    fetchSettings();
  }, [isAuthenticated]);

  useEffect(() => {
    // Connect to WebSocket server with CORS settings
    const socket = io(BACKEND_URL, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
      withCredentials: true,
      transports: ['websocket', 'polling'],
      upgrade: true,
    });

    socket.on("connect", () => {
      console.log("🔌 WS connected to backend:", BACKEND_URL);
    });

    socket.on("connect_error", (error) => {
      console.log("⚠️ WS connect_error:", error?.message || error);
    });

    socket.on("error", (error) => {
      console.log("⚠️ WS error:", error);
    });

    const parseLastUpdate = (str) => {
      // "24.06.2026 18:47:01" → subtract 3 hours (data comes as UTC+3 ahead)
      const [datePart, timePart] = str.split(" ");
      const [day, month, year] = datePart.split(".");
      const date = new Date(`${year}-${month}-${day}T${timePart}`);
      date.setHours(date.getHours() - 3);
      return `${String(date.getDate()).padStart(2,"0")}.${String(date.getMonth()+1).padStart(2,"0")}.${date.getFullYear()} ${String(date.getHours()).padStart(2,"0")}:${String(date.getMinutes()).padStart(2,"0")}:${String(date.getSeconds()).padStart(2,"0")}`;
    };

    // Listen for initial gold price when connecting
    socket.on("initialGoldPrice", (message) => {
      console.log("💰 [WS] initialGoldPrice:", message);
      setGoldPrice(message.data);
      if (message.data?.[0]?.last_update) {
        setLastDataTime(parseLastUpdate(message.data[0].last_update));
      }
    });

    // Listen for real-time gold price updates from WebSocket
    socket.on("goldPriceUpdate", (message) => {
      console.log("💰 [WS] goldPriceUpdate:", message);
      setGoldPrice(message.data);
      if (message.data?.[0]?.last_update) {
        setLastDataTime(parseLastUpdate(message.data[0].last_update));
      }
    });

    // Listen for initial silver price
    socket.on("initialSilverPrice", (message) => {
      console.log("🥈 [WS] initialSilverPrice:", message);
      if (message.data) {
        setSilverPrice(message.data);
        localStorage.setItem("silverPrice", JSON.stringify(message.data));
      }
    });

    // Listen for real-time silver price updates
    socket.on("silverPriceUpdate", (message) => {
      console.log("🥈 [WS] silverPriceUpdate:", message);
      if (message.data) {
        setSilverPrice(message.data);
        localStorage.setItem("silverPrice", JSON.stringify(message.data));
      }
    });

    // Listen for initial ONS price
    socket.on("initialOnsPrice", (message) => {
      console.log("🏆 [WS] initialOnsPrice:", message);
      if (message.data) {
        setOnsPrice(message.data);
        localStorage.setItem("onsPrice", JSON.stringify(message.data));
      }
    });

    // Listen for real-time ONS price updates
    socket.on("onsPriceUpdate", (message) => {
      console.log("🏆 [WS] onsPriceUpdate:", message);
      if (message.data) {
        setOnsPrice(message.data);
        localStorage.setItem("onsPrice", JSON.stringify(message.data));
      }
    });

    // Listen for initial currency rates
    socket.on("initialCurrencyRates", (message) => {
      // Always accept and save the data, merging with any existing values
      if (message.data) {
        setCurrencyRates((prevRates) => {
          const merged = mergeCurrencyRates(prevRates, message.data);
          localStorage.setItem("currencyRates", JSON.stringify(merged));
          return merged;
        });
      }
    });

    // Listen for real-time currency rate updates
    socket.on("currencyRatesUpdate", (message) => {
      // Merge incoming updates with previous values so missing currencies keep last price
      if (message.data) {
        setCurrencyRates((prevRates) => {
          const merged = mergeCurrencyRates(prevRates, message.data);
          localStorage.setItem("currencyRates", JSON.stringify(merged));
          return merged;
        });
      }
    });

    socket.on("settingsUpdate", (message) => {
      if (message?.tenantId && message.tenantId !== getTenantId()) {
        return;
      }
      if (message.data?.products && Array.isArray(message.data.products)) {
        setProducts(message.data.products);
      }
    });

    socket.on("disconnect", () => {});

    return () => {
      socket.disconnect();
    };
  }, []);

  // Auto-recalculate when gold price or labor/fixed costs change (only after settings loaded)
  useEffect(() => {
    if (!settingsLoaded) return;
    
    if (goldPrice && goldPrice[0]) {
      handleCalculatePrices();
    }
  }, [goldPrice, handleCalculatePrices, products, settingsLoaded]);

  const goToAdminPanel = () => {
    navigate("/admin/panel");
  };

  const has1000 = Array.isArray(hesaplananFiyat) ? hesaplananFiyat.find((x) => x?.key === "HAS ALTIN 1000") : null;
  const filteredProducts = Array.isArray(hesaplananFiyat) ? hesaplananFiyat.filter((x) => x?.key !== "HAS ALTIN 1000") : [];
  const groupedProducts = [];
  for (let i = 0; i < filteredProducts.length; i += 3) {
    groupedProducts.push(filteredProducts.slice(i, i + 3));
  }

  if (authLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "#1a1a1a" }}>
        <CircularProgress sx={{ color: "#d4af37" }} />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(180deg, #1a1a1a 0%, #2a2518 100%)",
          padding: 2,
        }}
      >
        <Card sx={{ maxWidth: 420, width: "100%", boxShadow: "0 8px 28px rgba(0,0,0,0.45)", backgroundColor: "#171717", border: "1px solid #6f5a1f" }}>
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", mb: 3 }}>
              <Box
                component="img"
                src={`${process.env.PUBLIC_URL}/siverek-emblem.svg`}
                alt="Logo"
                sx={{ width: 64, height: 64, borderRadius: "50%", boxShadow: "0 4px 14px rgba(0,0,0,0.35)", mb: 2 }}
              />
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  background: "linear-gradient(145deg, #c9a227 0%, #8b6914 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  mb: 2,
                }}
              >
                <LockOutlinedIcon sx={{ color: "white", fontSize: 24 }} />
              </Box>
              <Typography variant="h5" fontWeight="bold" color="#f0d98b" align="center">
                Kuyumcu Girişi
              </Typography>
              <Typography variant="body2" sx={{ mt: 1, color: "#b9a978" }} align="center">
                Canlı altın ve döviz fiyatlarını görüntülemek için giriş yapın
              </Typography>
            </Box>

            {loginError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {loginError}
              </Alert>
            )}

            <form onSubmit={handleLogin}>
              <TextField
                fullWidth
                label="Kullanıcı Adı"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                margin="normal"
                required
                autoFocus
                InputLabelProps={{ sx: { color: "#b9a978" } }}
                InputProps={{ sx: { color: "#f5e8b0", "& .MuiOutlinedInput-notchedOutline": { borderColor: "#5d4a1b" }, "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#d4af37" }, "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#d4af37" } } }}
              />
              <TextField
                fullWidth
                label="Şifre"
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                margin="normal"
                required
                InputLabelProps={{ sx: { color: "#b9a978" } }}
                InputProps={{ sx: { color: "#f5e8b0", "& .MuiOutlinedInput-notchedOutline": { borderColor: "#5d4a1b" }, "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#d4af37" }, "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#d4af37" } } }}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={loginLoading}
                sx={{
                  mt: 3,
                  mb: 2,
                  py: 1.5,
                  backgroundColor: "#d4af37",
                  "&:hover": { backgroundColor: "#b8962e" },
                }}
              >
                {loginLoading ? <CircularProgress size={24} color="inherit" /> : "Giriş Yap"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        background: "linear-gradient(180deg, #2a2a2a 0%, #3a3833 100%)",
        minHeight: "100vh",
        padding: { xs: "10px", sm: "14px", md: "20px" },
        boxSizing: "border-box",
      }}
    >

      <Box
        sx={{
          maxWidth: { xs: "100%", sm: "96%", md: "94%", lg: "92%", xl: "90%" },
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          marginBottom: "20px",
          padding: 0,
          boxSizing: "border-box",
        }}
      >
          {/* Header */}
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: { xs: "8px", md: "16px" }, flexWrap: "wrap", gap: "8px" }}>
            {/* Left: Logo + Shop Name + Chart */}
            <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 1.5, md: 2 }, flex: 1 }}>
              <Box
                component="img"
                src={`${process.env.PUBLIC_URL}/siverek-emblem.svg`}
                alt="Altin Logo"
                sx={{
                  width: { xs: 48, sm: 56, md: 64 },
                  height: { xs: 48, sm: 56, md: 64 },
                  borderRadius: "50%",
                  boxShadow: "0 4px 14px rgba(0,0,0,0.35)",
                  flexShrink: 0,
                }}
              />
              {admin?.shopName && (
                <Typography
                  sx={{
                    color: "#f5d76e",
                    fontWeight: "900",
                    fontSize: { xs: "18px", sm: "24px", md: "30px" },
                    lineHeight: 1.1,
                    letterSpacing: "2px",
                    textTransform: "uppercase",
                    textShadow: "0 2px 8px rgba(212, 175, 55, 0.4)",
                    flexShrink: 0,
                  }}
                >
                  {admin.shopName}
                </Typography>
              )}
            </Box>

            {/* Right: Tarih/saat + Çıkış */}
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 0.5 }}>
              {lastDataTime && (
                <Typography sx={{ color: "#e6c76a", fontSize: { xs: "14px", sm: "16px", md: "18px" }, fontWeight: "900", whiteSpace: "nowrap", letterSpacing: "0.5px" }}>
                  Son veri tarihi: {lastDataTime}
                </Typography>
              )}
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                {isAdmin && (
                  <IconButton
                    onClick={goToAdminPanel}
                    size="small"
                    sx={{
                      color: "#e6c76a",
                      border: "1px solid #7a6320",
                      borderRadius: "8px",
                      padding: "3px 8px",
                      transition: "all 0.3s",
                      "&:hover": { borderColor: "#d4af37", backgroundColor: "#1b1b1b", transform: "scale(1.1)" },
                    }}
                    title="Fiyat ve işçilik ayarları"
                  >
                    <SettingsIcon sx={{ fontSize: "18px" }} />
                  </IconButton>
                )}
                <Button
                  size="small"
                  onClick={handleLogout}
                  sx={{
                    textTransform: "none",
                    color: "#e6c76a",
                    minWidth: "auto",
                    fontSize: { xs: "10px", sm: "11px" },
                    border: "1px solid #7a6320",
                    borderRadius: "8px",
                    px: 1.5,
                    py: 0.25,
                    "&:hover": { borderColor: "#d4af37", backgroundColor: "#1b1b1b" },
                  }}
                >
                  Çıkış
                </Button>
              </Box>
            </Box>
          </Box>

          {/* Product cards + side market panel */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", lg: "2.5fr 1fr" },
              gap: { xs: 2, md: 2.5, lg: 3 },
              alignItems: "start",
            }}
          >
            <Box
              sx={{
                background: "linear-gradient(160deg, rgba(247,243,232,0.96) 0%, rgba(236,229,210,0.96) 100%)",
                border: "1px solid #b79a4c",
                borderRadius: "16px",
                padding: { xs: "12px", md: 1.75 },
                boxShadow: "0 10px 28px rgba(0,0,0,0.22)",
              }}
            >
              <Typography sx={{ color: "#8f6f20", fontWeight: 900, letterSpacing: 0.6, mb: 1.2, fontSize: { xs: "17px", md: "19px" } }}>
                GUNCEL ALTIN FIYATLARI
              </Typography>

              {/* Top row: HAS 1000 + ONS + GÜMÜŞ */}
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr 1fr" }, gap: "12px", mb: 1.5 }}>
                {/* HAS ALTIN 1000 */}
                {has1000 && (() => {
                  const hi = hesaplananFiyat.findIndex((x) => x?.key === "HAS ALTIN 1000");
                  return (
                  <Box sx={{
                    background: "linear-gradient(165deg, #fdf6e3 0%, #f0e0b0 100%)",
                    border: "1px solid #c5a95d",
                    borderRadius: "12px",
                    p: 1.5,
                    boxShadow: "0 8px 20px rgba(0,0,0,0.12)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}>
                    <Typography sx={{
                      fontSize: { xs: "15px", md: "18px" },
                      fontWeight: 900,
                      color: "#8a6a20",
                      textAlign: "center",
                      borderBottom: "1px solid #d8c79a",
                      pb: 1,
                      letterSpacing: "1px",
                    }}>
                      HAS ALTIN 1000
                    </Typography>
                    <Box sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      p: "10px 12px",
                      borderRadius: "12px",
                      backgroundColor: "rgba(212, 175, 55, 0.08)",
                      border: "1px solid rgba(160,140,80,0.18)",
                    }}>
                      <Box sx={{
                        width: { xs: "36px", md: "44px" },
                        height: { xs: "36px", md: "44px" },
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, #d4af37 0%, #8a6a20 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
                      }}>
                        <Typography sx={{ fontSize: { xs: "14px", md: "18px" }, fontWeight: 900, color: "#fff", lineHeight: 1 }}>Au</Typography>
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontSize: { xs: "13px", md: "16px" }, fontWeight: 800, color: "#5e4a1a", mb: 0.3 }}>
                          {has1000.subtitle || "Has Altın"}
                        </Typography>
                        <Box sx={{ display: "flex", gap: "10px" }}>
                          <Typography sx={{ fontSize: { xs: "16px", md: "17px" }, fontWeight: 900, color: "#35C051" }}>
                            {formatNumber(calculatedPrices[hi]?.buy || has1000.buy, { decimals: 2 })}
                          </Typography>
                          <Typography sx={{ fontSize: { xs: "16px", md: "17px" }, fontWeight: 900, color: "#e74c3c" }}>
                            {formatNumber(calculatedPrices[hi]?.sell || has1000.sell, { decimals: 2 })}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  </Box>
                  );
                })()}
                {/* ONS ALTIN */}
                {onsPrice && (
                  <Box sx={{
                    background: "linear-gradient(165deg, #fdf6e3 0%, #f0e0b0 100%)",
                    border: "1px solid #c5a95d",
                    borderRadius: "12px",
                    p: 1.5,
                    boxShadow: "0 8px 20px rgba(0,0,0,0.12)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}>
                    <Typography sx={{
                      fontSize: { xs: "15px", md: "18px" },
                      fontWeight: 900,
                      color: "#8a6a20",
                      textAlign: "center",
                      borderBottom: "1px solid #d8c79a",
                      pb: 1,
                      letterSpacing: "1px",
                    }}>
                      ONS ALTIN
                    </Typography>
                    <Box sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      p: "10px 12px",
                      borderRadius: "12px",
                      backgroundColor: "rgba(212, 175, 55, 0.08)",
                      border: "1px solid rgba(160,140,80,0.18)",
                    }}>
                      <Box sx={{
                        width: { xs: "36px", md: "44px" },
                        height: { xs: "36px", md: "44px" },
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, #d4af37 0%, #8a6a20 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
                      }}>
                        <Typography sx={{ fontSize: { xs: "16px", md: "20px" }, fontWeight: 900, color: "#fff", lineHeight: 1 }}>◆</Typography>
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontSize: { xs: "13px", md: "16px" }, fontWeight: 800, color: "#5e4a1a", mb: 0.3 }}>
                          USD / OZ
                        </Typography>
                        <Box sx={{ display: "flex", gap: "10px" }}>
                          <Typography sx={{ fontSize: { xs: "16px", md: "17px" }, fontWeight: 900, color: "#35C051" }}>
                            {formatNumber(parseFloat(onsPrice.buy), { decimals: 2 })}
                          </Typography>
                          <Typography sx={{ fontSize: { xs: "16px", md: "17px" }, fontWeight: 900, color: "#e74c3c" }}>
                            {formatNumber(parseFloat(onsPrice.sell), { decimals: 2 })}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  </Box>
                )}
                {/* GÜMÜŞ */}
                {silverPrice && (
                  <Box sx={{
                    background: "linear-gradient(165deg, #f8f8f8 0%, #e9e9e9 100%)",
                    border: "1px solid #b5b5b5",
                    borderRadius: "12px",
                    p: 1.5,
                    boxShadow: "0 8px 20px rgba(0,0,0,0.12)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}>
                    <Box sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      borderBottom: "1px solid #d6d6d6",
                      pb: 1,
                    }}>
                      <Box sx={{
                        width: "26px",
                        height: "26px",
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, #9e9e9e 0%, #666666 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}>
                        <Typography sx={{ fontSize: "13px", fontWeight: 900, color: "#fff", lineHeight: 1 }}>⬡</Typography>
                      </Box>
                      <Typography sx={{
                        fontSize: { xs: "15px", md: "18px" },
                        fontWeight: 900,
                        color: "#606060",
                        letterSpacing: "1px",
                      }}>
                        GÜMÜŞ
                      </Typography>
                    </Box>
                    <Box sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      p: "10px 12px",
                      borderRadius: "10px",
                      backgroundColor: "rgba(128, 128, 128, 0.06)",
                    }}>
                      <Box sx={{
                        width: { xs: "34px", md: "46px" },
                        height: { xs: "34px", md: "46px" },
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, #bdbdbd 0%, #757575 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
                      }}>
                        <Typography sx={{ fontSize: { xs: "14px", md: "18px" }, fontWeight: 900, color: "#fff", lineHeight: 1 }}>Ag</Typography>
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontSize: { xs: "13px", md: "16px" }, fontWeight: 800, color: "#555", mb: 0.3 }}>
                          GR / TL
                        </Typography>
                        <Box sx={{ display: "flex", gap: "10px" }}>
                          <Typography sx={{ fontSize: { xs: "16px", md: "17px" }, fontWeight: 900, color: "#35C051" }}>
                            {formatNumber(parseFloat(silverPrice.buy), { decimals: 2 })}
                          </Typography>
                          <Typography sx={{ fontSize: { xs: "16px", md: "17px" }, fontWeight: 900, color: "#e74c3c" }}>
                            {formatNumber(parseFloat(silverPrice.sell), { decimals: 2 })}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  </Box>
                )}
              </Box>

              <Box>
                {groupedProducts.map((group, groupIndex) => (
                  <Box
                    key={groupIndex}
                    sx={{
                      mt: groupIndex === 0 ? 1 : 1.5,
                      pt: groupIndex === 0 ? 0 : 1.5,
                      borderTop: groupIndex === 0 ? "none" : "1px solid #c6af74",
                    }}
                  >
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", lg: "1fr 1fr 1fr" },
                        gap: 1,
                      }}
                    >
                      {group.map((item) => {
                        const originalIndex = hesaplananFiyat.findIndex((x) => x?.key === item.key);
                        const currentPrice = calculatedPrices[originalIndex]?.buy || item.buy;
                        return (
                          <Box
                            key={`${groupIndex}-${item.key}`}
                            sx={{
                              borderRadius: "12px",
                              border: "1px solid #d5c49a",
                              backgroundColor: "rgba(255,255,255,0.72)",
                              p: 1.1,
                              transition: "all .2s ease",
                              "&:hover": { transform: "translateY(-1px)", borderColor: "#b79a4c", backgroundColor: "rgba(255,255,255,0.95)" },
                            }}
                          >
                            <Typography sx={{ color: "#8a6b22", fontWeight: 900, fontSize: { xs: "17px", md: "18px" }, lineHeight: 1.2 }}>
                              {item.key}
                            </Typography>
                            <Typography sx={{ color: "#7d745b", fontSize: { xs: "13px", md: "14px" }, mb: 0.7 }}>
                              {item.subtitle || item.key}
                            </Typography>
                            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                              <Typography sx={{ color: "#00c853", fontWeight: 900, fontSize: { xs: "20px", md: "22px" } }}>
                                {formatNumber(currentPrice, { decimals: item.key === "HAS ALTIN 1000" ? 2 : 0 })}
                              </Typography>
                              <Typography sx={{ color: "#ff1744", fontWeight: 900, fontSize: { xs: "20px", md: "22px" } }}>
                                {formatNumber(calculatedPrices[originalIndex]?.sell || item.sell, { decimals: item.key === "HAS ALTIN 1000" ? 2 : 0 })}
                              </Typography>
                            </Box>
                          </Box>
                        );
                      })}
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>

            <Box sx={{ width: "100%", boxSizing: "border-box", overflow: "hidden" }}>
              <CurrencyBar
                currencyRates={currencyRates}
                formatNumber={formatNumber}
                isMobile={false}
              />
            </Box>
          </Box>

      </Box>
    </Box>
  );
}

export default App;
