import React from "react";
import { Box, Typography } from "@mui/material";

// Currency bar component that displays latest currency rates
function CurrencyBar({ currencyRates, formatNumber, isMobile = false }) {
  // Ensure fixed order for main currencies: USD, EUR, GBP, then others
  const order = ["USD", "EUR", "GBP"];
  const sortedRates = currencyRates && currencyRates.length > 0
    ? [...currencyRates].sort((a, b) => {
        const ia = order.indexOf(a.key);
        const ib = order.indexOf(b.key);

        if (ia === -1 && ib === -1) return 0;
        if (ia === -1) return 1;
        if (ib === -1) return -1;
        return ia - ib;
      })
    : [];

  // Format currency values with 3 decimal places (e.g. 42.340)
  const formatFxNumber = (number) => {
    const value = Number.isFinite(number) ? number : 0;
    return new Intl.NumberFormat("tr-TR", {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    }).format(value);
  };

  // Unified style tokens for modern currency badges
  const getCurrencyStyle = (key) => {
    switch (key) {
      case "USD":
        return {
          badgeText: "$",
          badgeSub: "USD",
          bgColor: "#2f8f46",
          lightBg: "rgba(47, 143, 70, 0.12)",
        };
      case "EUR":
        return {
          badgeText: "€",
          badgeSub: "EUR",
          bgColor: "#1b6fd1",
          lightBg: "rgba(27, 111, 209, 0.12)",
        };
      case "GBP":
        return {
          badgeText: "£",
          badgeSub: "GBP",
          bgColor: "#7a2eb8",
          lightBg: "rgba(122, 46, 184, 0.12)",
        };
      default:
        return {
          badgeText: "¤",
          badgeSub: key,
          bgColor: "#6f6f6f",
          lightBg: "rgba(111, 111, 111, 0.1)",
        };
    }
  };

  // Mobile layout: horizontal compact cards
  if (isMobile) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: "12px", width: "100%", boxSizing: "border-box" }}>
        {/* Currency rates */}
        {sortedRates.length > 0 && (
          <Box
            sx={{
              background: "linear-gradient(165deg, #fbf8f0 0%, #f1e8d3 100%)",
              border: "1px solid #c5a95d",
              borderRadius: "12px",
              p: 1.2,
              width: "100%",
              boxSizing: "border-box",
            }}
          >
            <Typography
              sx={{
                fontSize: "15px",
                fontWeight: "900",
                color: "#8a6a20",
                textAlign: "center",
                borderBottom: "1px solid #d8c79a",
                pb: 0.8,
                mb: 1,
                letterSpacing: 0.8,
              }}
            >
              DÖVİZ
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {sortedRates.map((rate, index) => {
                const style = getCurrencyStyle(rate.key);
                return (
                  <Box
                    key={index}
                    sx={{
                      padding: "10px 12px",
                      backgroundColor: style.lightBg,
                      borderRadius: "10px",
                      border: "1px solid #d8c79a",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <Box
                      sx={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "50%",
                        background: `linear-gradient(135deg, ${style.bgColor} 0%, #24413f 100%)`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Typography sx={{ fontSize: "16px", fontWeight: "900", color: "#fff", lineHeight: 1 }}>
                        {style.badgeText}
                      </Typography>
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography sx={{ fontSize: "15px", fontWeight: "900", color: "#5e4a1a", lineHeight: 1.1 }}>
                        {rate.key}
                      </Typography>
                      <Box sx={{ display: "flex", gap: "10px", mt: 0.3 }}>
                        <Typography sx={{ fontWeight: "bold", color: "#35C051", fontSize: "14px" }}>
                          {formatFxNumber(parseFloat(rate.buy))}
                        </Typography>
                        <Typography sx={{ fontWeight: "bold", color: "#e74c3c", fontSize: "14px" }}>
                          {formatFxNumber(parseFloat(rate.sell))}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </Box>
        )}
      </Box>
    );
  }

  // Desktop layout: vertical panel
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "12px", width: "100%", boxSizing: "border-box" }}>
      {/* Currency rates panel */}
      {sortedRates.length > 0 && (
        <Box
          sx={{
            width: "100%",
            boxSizing: "border-box",
            padding: "12px",
            background: "linear-gradient(165deg, #fbf8f0 0%, #f1e8d3 100%)",
            borderRadius: "12px",
            border: "1px solid #c5a95d",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            boxShadow: "0 8px 20px rgba(0,0,0,0.14)",
          }}
        >
          <Typography
            sx={{
              fontSize: "18px",
              fontWeight: "900",
              color: "#8a6a20",
              textAlign: "center",
              borderBottom: "1px solid #d8c79a",
              paddingBottom: "8px",
              letterSpacing: "1px",
            }}
          >
            DÖVİZ
          </Typography>
          {sortedRates.map((rate, index) => {
            const style = getCurrencyStyle(rate.key);
            return (
              <Box
                key={index}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "10px 12px",
                  borderRadius: "12px",
                  backgroundColor: style.lightBg,
                  border: "1px solid rgba(160,140,80,0.18)",
                  transition: "all 0.2s ease",
                  "&:hover": {
                    transform: "translateX(4px)",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                  },
                }}
              >
                <Box
                  sx={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "50%",
                    background: `linear-gradient(135deg, ${style.bgColor} 0%, #24413f 100%)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
                  }}
                >
                  <Typography sx={{ fontSize: "20px", fontWeight: "900", color: "#fff", lineHeight: 1 }}>
                    {style.badgeText}
                  </Typography>
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    sx={{
                      fontSize: "22px",
                      fontWeight: "900",
                      color: "#3a2f1a",
                      letterSpacing: "0.5px",
                    }}
                  >
                    {rate.key}
                  </Typography>
                  <Box sx={{ display: "flex", gap: "12px", marginTop: "2px" }}>
                    <Typography sx={{ fontSize: "17px", fontWeight: "bold", color: "#35C051" }}>
                      {formatFxNumber(parseFloat(rate.buy))}
                    </Typography>
                    {rate.sell !== undefined && (
                      <Typography sx={{ fontSize: "17px", fontWeight: "bold", color: "#e74c3c" }}>
                        {formatFxNumber(parseFloat(rate.sell))}
                      </Typography>
                    )}
                  </Box>
                </Box>
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
}

export default CurrencyBar;
