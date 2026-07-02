import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useAuth } from '../context/AuthContext';

const AdminLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      navigate('/');
    }
  }, [isAuthenticated, authLoading, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Giriş başarısız');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0f0f0f',
        padding: 2,
      }}
    >
      <Card sx={{ maxWidth: 420, width: '100%', boxShadow: '0 8px 28px rgba(0,0,0,0.45)', backgroundColor: '#171717', border: '1px solid #6f5a1f' }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: 'linear-gradient(145deg, #c9a227 0%, #8b6914 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 2,
              }}
            >
              <LockOutlinedIcon sx={{ color: 'white', fontSize: 28 }} />
            </Box>
            <Typography variant="h5" fontWeight="bold" color="#f0d98b" align="center">
              Yonetim Girisi
            </Typography>
            <Typography variant="body2" sx={{ mt: 1, color: '#b9a978' }} align="center">
              Canlı altın ve döviz fiyatlarını görüntülemek için giriş yapın
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Kullanıcı Adı"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              margin="normal"
              required
              autoFocus
              InputLabelProps={{ sx: { color: '#b9a978' } }}
              InputProps={{ sx: { color: '#f5e8b0', '& .MuiOutlinedInput-notchedOutline': { borderColor: '#5d4a1b' }, '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#d4af37' }, '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#d4af37' } } }}
            />
            <TextField
              fullWidth
              label="Şifre"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              required
              InputLabelProps={{ sx: { color: '#b9a978' } }}
              InputProps={{ sx: { color: '#f5e8b0', '& .MuiOutlinedInput-notchedOutline': { borderColor: '#5d4a1b' }, '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#d4af37' }, '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#d4af37' } } }}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              sx={{
                mt: 3,
                mb: 2,
                py: 1.5,
                backgroundColor: '#d4af37',
                '&:hover': {
                  backgroundColor: '#b8962e',
                },
              }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Giriş Yap'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
};

export default AdminLogin;
