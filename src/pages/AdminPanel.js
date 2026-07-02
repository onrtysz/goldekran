import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Grid,
  Divider,
  IconButton,
  Snackbar,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import SaveIcon from '@mui/icons-material/Save';
import HomeIcon from '@mui/icons-material/Home';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import { useAuth } from '../context/AuthContext';
import { settingsService } from '../services/api';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'https://apiharem.kuyumcufatih.com';

const DEFAULT_PRODUCTS = [
  { key: "HAS ALTIN 1000", subtitle: "Harem 1.000", buyFixed: 1, sellFixed: 1, buyLabor: 0, sellLabor: 0 },
  { key: "HAS ALTIN 995", subtitle: "Paketli 24 ayar", buyFixed: 0.995, sellFixed: 0.995, buyLabor: 0, sellLabor: 0 },
  { key: "GRAM ALTIN 916", subtitle: "Paketli 22 ayar", buyFixed: 0.916, sellFixed: 0.916, buyLabor: 0, sellLabor: 0 },
  { key: "GRAM ALTIN 913", subtitle: "Hurda altın", buyFixed: 0.913, sellFixed: 0.913, buyLabor: 0, sellLabor: 0 },
  { key: "ZİYNET ESKİ", subtitle: "Ziynet eski", buyFixed: 6.38, sellFixed: 6.38, buyLabor: 0, sellLabor: 0 },
  { key: "YARIM ESKİ", subtitle: "Yarım eski", buyFixed: 3.265, sellFixed: 3.265, buyLabor: 0, sellLabor: 0 },
  { key: "ÇEYREK ESKİ", subtitle: "Çeyrek eski", buyFixed: 1.6325, sellFixed: 1.6325, buyLabor: 0, sellLabor: 0 },
  { key: "ZİYNET YENİ", subtitle: "Ziynet yeni", buyFixed: 6.44, sellFixed: 6.44, buyLabor: 0, sellLabor: 0 },
  { key: "YARIM YENİ", subtitle: "Yarım yeni", buyFixed: 3.265, sellFixed: 3.265, buyLabor: 0, sellLabor: 0 },
  { key: "ÇEYREK YENİ", subtitle: "Çeyrek yeni", buyFixed: 1.5975, sellFixed: 1.5975, buyLabor: 0, sellLabor: 0 },
  { key: "BİLEZİK BURMA", subtitle: "Ajda, çöp, burma", buyFixed: 0.919, sellFixed: 0.919, buyLabor: 0, sellLabor: 0 },
  { key: "BİLEZİK AYNALI", subtitle: "Cnc", buyFixed: 0.921, sellFixed: 0.921, buyLabor: 0, sellLabor: 0 },
  { key: "KORDON", subtitle: "Madonna, akıtma", buyFixed: 0.920, sellFixed: 0.920, buyLabor: 0, sellLabor: 0 },
];

const roundTo1 = (num) => Math.ceil(num);

const AdminPanel = () => {
  const [products, setProducts] = useState([...DEFAULT_PRODUCTS]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [goldPrice, setGoldPrice] = useState({ buy: 0, sell: 0 });
  const [manualGoldPrice, setManualGoldPrice] = useState({ buy: '', sell: '' });
  const [useManualPrice, setUseManualPrice] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newProduct, setNewProduct] = useState({ key: '', subtitle: '', buyFixed: 1, sellFixed: 1, buyLabor: 0, sellLabor: 0 });

  const { isAuthenticated, isAdmin, logout, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, authLoading, navigate]);

  useEffect(() => {
    if (!authLoading && isAuthenticated && !isAdmin) {
      navigate('/');
    }
  }, [isAuthenticated, isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchSettings();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const socket = io(BACKEND_URL, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });

    socket.on('initialGoldPrice', (message) => {
      if (message.data && message.data[0]) {
        setGoldPrice({
          buy: parseFloat(message.data[0].buy) || 0,
          sell: parseFloat(message.data[0].sell) || 0,
        });
      }
    });

    socket.on('goldPriceUpdate', (message) => {
      if (message.data && message.data[0]) {
        setGoldPrice({
          buy: parseFloat(message.data[0].buy) || 0,
          sell: parseFloat(message.data[0].sell) || 0,
        });
      }
    });

    return () => socket.disconnect();
  }, []);

  const getActiveGoldPrice = () => {
    if (useManualPrice && (manualGoldPrice.buy || manualGoldPrice.sell)) {
      return {
        buy: parseFloat(manualGoldPrice.buy) || 0,
        sell: parseFloat(manualGoldPrice.sell) || 0,
      };
    }
    return goldPrice;
  };

  const toNum = (v, fallback = 0) => {
    if (typeof v === 'number') return v;
    const n = parseFloat(String(v).replace(',', '.'));
    return isNaN(n) ? fallback : n;
  };

  const calculatePrice = (product, type) => {
    const activePrice = getActiveGoldPrice();
    const basePrice = type === 'buy' ? activePrice.buy : activePrice.sell;
    const labor = type === 'buy' ? toNum(product.buyLabor) : toNum(product.sellLabor);
    const fixed = type === 'buy' ? toNum(product.buyFixed, 1) : toNum(product.sellFixed, 1);

    if (basePrice === 0) return '-';

    return roundTo1((basePrice + labor) * fixed).toLocaleString('tr-TR');
  };

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await settingsService.getSettings();
      if (response.success && response.settings.products) {
        setProducts(response.settings.products);
      }
    } catch (err) {
      setError('Ayarlar yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');

      const cleanProducts = products.map(p => ({
        ...p,
        buyFixed: toNum(p.buyFixed, 1),
        sellFixed: toNum(p.sellFixed, 1),
        buyLabor: toNum(p.buyLabor),
        sellLabor: toNum(p.sellLabor),
      }));
      const response = await settingsService.updateSettings({ products: cleanProducts });

      if (response.success) {
        setSuccess('Ayarlar başarıyla kaydedildi!');
        setSnackbarOpen(true);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Kaydetme başarısız');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleProductFieldChange = (index, field, value) => {
    setProducts(prev => {
      const updated = [...prev];
      if (field === 'key' || field === 'subtitle') {
        updated[index] = { ...updated[index], [field]: value };
      } else {
        updated[index] = { ...updated[index], [field]: value.replace(',', '.') };
      }
      return updated;
    });
  };

  const handleAddProduct = () => {
    if (!newProduct.key.trim()) return;
    setProducts(prev => [...prev, { ...newProduct, key: newProduct.key.trim(), subtitle: newProduct.subtitle.trim() }]);
    setNewProduct({ key: '', subtitle: '', buyFixed: 1, sellFixed: 1, buyLabor: 0, sellLabor: 0 });
    setAddDialogOpen(false);
  };

  const handleRemoveProduct = (index) => {
    if (products.length <= 1) return;
    setProducts(prev => prev.filter((_, i) => i !== index));
  };

  if (authLoading || loading) {
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
        background: 'linear-gradient(180deg, #2a2a2a 0%, #3a3833 100%)',
        padding: { xs: 2, md: 4 },
      }}
    >
      <Box sx={{ maxWidth: 1200, margin: '0 auto' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" fontWeight="bold" sx={{ color: '#d4af37' }}>
            Admin Paneli
          </Typography>
          <Box>
            <IconButton onClick={() => navigate('/')} title="Ana Sayfa" sx={{ color: '#d4af37' }}>
              <HomeIcon />
            </IconButton>
            <IconButton onClick={handleLogout} title="Çıkış Yap" sx={{ color: '#ff8d7a' }}>
              <LogoutIcon />
            </IconButton>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Card sx={{ mb: 3, boxShadow: '0 10px 28px rgba(0,0,0,0.2)', background: 'linear-gradient(160deg, rgba(247,243,232,0.96) 0%, rgba(236,229,210,0.96) 100%)', border: '1px solid #b79a4c' }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
              <Typography variant="h6" fontWeight="bold" sx={{ color: '#8a6b22' }}>
                İşçilik ve Sabit Maliyet Ayarları
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {goldPrice.buy > 0 ? (
                  <Chip
                    label={`Canlı: ₺${goldPrice.buy.toLocaleString('tr-TR')} / ₺${goldPrice.sell.toLocaleString('tr-TR')}`}
                    color="success"
                    sx={{ fontWeight: 'bold' }}
                  />
                ) : (
                  <>
                    <TextField
                      size="small"
                      label="Alış"
                      type="number"
                      value={manualGoldPrice.buy}
                      onChange={(e) => {
                        setManualGoldPrice(prev => ({ ...prev, buy: e.target.value }));
                        setUseManualPrice(true);
                      }}
                      sx={{ width: '100px' }}
                      placeholder="6800"
                    />
                    <TextField
                      size="small"
                      label="Satış"
                      type="number"
                      value={manualGoldPrice.sell}
                      onChange={(e) => {
                        setManualGoldPrice(prev => ({ ...prev, sell: e.target.value }));
                        setUseManualPrice(true);
                      }}
                      sx={{ width: '100px' }}
                      placeholder="6850"
                    />
                    <Chip
                      label="Test Fiyatı"
                      color="warning"
                      size="small"
                    />
                  </>
                )}
              </Box>
            </Box>
            <Typography variant="body2" sx={{ mb: 3, color: '#6f6448' }}>
              Bu değerler tüm kullanıcılar için anlık olarak güncellenecektir. Fiyatlar 1 TL'ye yuvarlanır.
              {goldPrice.buy === 0 && " (Canlı fiyat bağlantısı yok - test için manuel fiyat girin)"}
            </Typography>

            <Divider sx={{ mb: 3, borderColor: '#2f2f2f' }} />

            <Grid container spacing={2}>
              {/* Desktop/tablet: dense table editor */}
              <Grid item xs={12} sx={{ display: { xs: 'none', md: 'block' } }}>
                <Box sx={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#e8dfc6' }}>
                        <th style={{ padding: '12px 8px', textAlign: 'left', borderBottom: '2px solid #d4af37', fontWeight: 'bold', width: '30px' }}>#</th>
                        <th style={{ padding: '12px 8px', textAlign: 'left', borderBottom: '2px solid #d4af37', fontWeight: 'bold' }}>Ürün</th>
                        <th style={{ padding: '12px 8px', textAlign: 'left', borderBottom: '2px solid #d4af37', fontWeight: 'bold' }}>Alt Başlık</th>
                        <th style={{ padding: '12px 8px', textAlign: 'center', borderBottom: '2px solid #d4af37', fontWeight: 'bold', color: '#35C051' }}>Alış İşçilik</th>
                        <th style={{ padding: '12px 8px', textAlign: 'center', borderBottom: '2px solid #d4af37', fontWeight: 'bold', color: '#35C051' }}>Alış Sabit</th>
                        <th style={{ padding: '12px 8px', textAlign: 'center', borderBottom: '2px solid #d4af37', fontWeight: 'bold', color: '#2f8f46', backgroundColor: '#dff1e2' }}>Alış Fiyat</th>
                        <th style={{ padding: '12px 8px', textAlign: 'center', borderBottom: '2px solid #d4af37', fontWeight: 'bold', color: '#e74c3c' }}>Satış İşçilik</th>
                        <th style={{ padding: '12px 8px', textAlign: 'center', borderBottom: '2px solid #d4af37', fontWeight: 'bold', color: '#e74c3c' }}>Satış Sabit</th>
                        <th style={{ padding: '12px 8px', textAlign: 'center', borderBottom: '2px solid #d4af37', fontWeight: 'bold', color: '#d65c4b', backgroundColor: '#f7dfdf' }}>Satış Fiyat</th>
                        <th style={{ padding: '12px 8px', textAlign: 'center', borderBottom: '2px solid #d4af37', width: '50px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map((product, index) => (
                        <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#fbf8ef' : '#f2ead7' }}>
                          <td style={{ padding: '8px', color: '#999', fontSize: '12px' }}>{index + 1}</td>
                          <td style={{ padding: '8px' }}>
                            <TextField
                              size="small"
                              value={product.key}
                              onChange={(e) => handleProductFieldChange(index, 'key', e.target.value)}
                              sx={{ width: '150px' }}
                              inputProps={{ style: { fontWeight: 600, color: '#d4af37' } }}
                            />
                          </td>
                          <td style={{ padding: '8px' }}>
                            <TextField
                              size="small"
                              value={product.subtitle || ''}
                              onChange={(e) => handleProductFieldChange(index, 'subtitle', e.target.value)}
                              sx={{ width: '130px' }}
                              placeholder="Alt başlık"
                            />
                          </td>
                          <td style={{ padding: '8px' }}>
                            <TextField
                              size="small"
                              value={product.buyLabor || ''}
                              onChange={(e) => handleProductFieldChange(index, 'buyLabor', e.target.value)}
                              sx={{ width: '90px' }}
                              inputProps={{ inputMode: 'decimal' }}
                            />
                          </td>
                          <td style={{ padding: '8px' }}>
                            <TextField
                              size="small"
                              value={product.buyFixed || ''}
                              onChange={(e) => handleProductFieldChange(index, 'buyFixed', e.target.value)}
                              sx={{ width: '90px' }}
                              inputProps={{ inputMode: 'decimal' }}
                            />
                          </td>
                          <td style={{ padding: '8px', textAlign: 'center', backgroundColor: '#e8f5e9', fontWeight: 'bold', color: '#35C051' }}>
                            ₺{calculatePrice(product, 'buy')}
                          </td>
                          <td style={{ padding: '8px' }}>
                            <TextField
                              size="small"
                              value={product.sellLabor || ''}
                              onChange={(e) => handleProductFieldChange(index, 'sellLabor', e.target.value)}
                              sx={{ width: '90px' }}
                              inputProps={{ inputMode: 'decimal' }}
                            />
                          </td>
                          <td style={{ padding: '8px' }}>
                            <TextField
                              size="small"
                              value={product.sellFixed || ''}
                              onChange={(e) => handleProductFieldChange(index, 'sellFixed', e.target.value)}
                              sx={{ width: '90px' }}
                              inputProps={{ inputMode: 'decimal' }}
                            />
                          </td>
                          <td style={{ padding: '8px', textAlign: 'center', backgroundColor: '#ffebee', fontWeight: 'bold', color: '#e74c3c' }}>
                            ₺{calculatePrice(product, 'sell')}
                          </td>
                          <td style={{ padding: '8px', textAlign: 'center' }}>
                            <IconButton
                              size="small"
                              onClick={() => handleRemoveProduct(index)}
                              disabled={products.length <= 1}
                              sx={{ color: '#e74c3c' }}
                              title="Ürünü Sil"
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Box>
              </Grid>

              {/* Mobile: product cards */}
              <Grid item xs={12} sx={{ display: { xs: 'block', md: 'none' } }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                  {products.map((product, index) => (
                    <Box
                      key={index}
                      sx={{
                        backgroundColor: '#f8f4e8',
                        border: '1px solid #d5c49a',
                        borderRadius: '12px',
                        p: 1.2,
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.9 }}>
                        <Typography sx={{ fontWeight: 800, color: '#8a6b22' }}>
                          {product.key}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={() => handleRemoveProduct(index)}
                          disabled={products.length <= 1}
                          sx={{ color: '#e74c3c' }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>

                      <Grid container spacing={1}>
                        <Grid item xs={6}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Ürün Adı"
                            value={product.key}
                            onChange={(e) => handleProductFieldChange(index, 'key', e.target.value)}
                          />
                        </Grid>
                        <Grid item xs={6}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Alt Başlık"
                            value={product.subtitle || ''}
                            onChange={(e) => handleProductFieldChange(index, 'subtitle', e.target.value)}
                          />
                        </Grid>
                        <Grid item xs={6}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Alış İşçilik"
                            value={product.buyLabor || ''}
                            onChange={(e) => handleProductFieldChange(index, 'buyLabor', e.target.value)}
                            inputProps={{ inputMode: 'decimal' }}
                          />
                        </Grid>
                        <Grid item xs={6}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Alış Sabit"
                            value={product.buyFixed || ''}
                            onChange={(e) => handleProductFieldChange(index, 'buyFixed', e.target.value)}
                            inputProps={{ inputMode: 'decimal' }}
                          />
                        </Grid>
                        <Grid item xs={6}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Satış İşçilik"
                            value={product.sellLabor || ''}
                            onChange={(e) => handleProductFieldChange(index, 'sellLabor', e.target.value)}
                            inputProps={{ inputMode: 'decimal' }}
                          />
                        </Grid>
                        <Grid item xs={6}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Satış Sabit"
                            value={product.sellFixed || ''}
                            onChange={(e) => handleProductFieldChange(index, 'sellFixed', e.target.value)}
                            inputProps={{ inputMode: 'decimal' }}
                          />
                        </Grid>
                      </Grid>

                      <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                        <Box sx={{ flex: 1, backgroundColor: '#e8f5e9', borderRadius: '8px', py: 0.7, textAlign: 'center' }}>
                          <Typography sx={{ color: '#2f8f46', fontWeight: 800, fontSize: '12px' }}>Alış</Typography>
                          <Typography sx={{ color: '#2f8f46', fontWeight: 900 }}>₺{calculatePrice(product, 'buy')}</Typography>
                        </Box>
                        <Box sx={{ flex: 1, backgroundColor: '#ffebee', borderRadius: '8px', py: 0.7, textAlign: 'center' }}>
                          <Typography sx={{ color: '#d65c4b', fontWeight: 800, fontSize: '12px' }}>Satış</Typography>
                          <Typography sx={{ color: '#d65c4b', fontWeight: 900 }}>₺{calculatePrice(product, 'sell')}</Typography>
                        </Box>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Grid>
            </Grid>

            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Button
                variant="outlined"
                startIcon={<AddCircleIcon />}
                onClick={() => setAddDialogOpen(true)}
                sx={{
                  borderColor: '#d4af37',
                  color: '#d4af37',
                  '&:hover': { borderColor: '#b8962e', backgroundColor: 'rgba(212,175,55,0.08)' },
                }}
              >
                Ürün Ekle
              </Button>
              <Button
                variant="contained"
                startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                onClick={handleSave}
                disabled={saving}
                sx={{
                  backgroundColor: '#d4af37',
                  '&:hover': { backgroundColor: '#b8962e' },
                  px: 4,
                  py: 1.5,
                }}
              >
                {saving ? 'Kaydediliyor...' : 'Kaydet'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Add Product Dialog */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold', color: '#8a6b22' }}>Yeni Ürün Ekle</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Ürün Adı"
              value={newProduct.key}
              onChange={(e) => setNewProduct(prev => ({ ...prev, key: e.target.value }))}
              fullWidth
              required
              placeholder="Örn: REŞAT ALTIN"
            />
            <TextField
              label="Alt Başlık"
              value={newProduct.subtitle}
              onChange={(e) => setNewProduct(prev => ({ ...prev, subtitle: e.target.value }))}
              fullWidth
              placeholder="Örn: Reşat"
            />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="Alış Sabit Katsayı"
                  value={newProduct.buyFixed}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, buyFixed: e.target.value.replace(',', '.') }))}
                  fullWidth
                  inputProps={{ inputMode: 'decimal' }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Satış Sabit Katsayı"
                  value={newProduct.sellFixed}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, sellFixed: e.target.value.replace(',', '.') }))}
                  fullWidth
                  inputProps={{ inputMode: 'decimal' }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Alış İşçilik"
                  value={newProduct.buyLabor}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, buyLabor: e.target.value.replace(',', '.') }))}
                  fullWidth
                  inputProps={{ inputMode: 'decimal' }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Satış İşçilik"
                  value={newProduct.sellLabor}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, sellLabor: e.target.value.replace(',', '.') }))}
                  fullWidth
                  inputProps={{ inputMode: 'decimal' }}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setAddDialogOpen(false)} sx={{ color: '#999' }}>
            İptal
          </Button>
          <Button
            onClick={handleAddProduct}
            variant="contained"
            disabled={!newProduct.key.trim()}
            sx={{ backgroundColor: '#d4af37', '&:hover': { backgroundColor: '#b8962e' } }}
          >
            Ekle
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        message={success}
      />
    </Box>
  );
};

export default AdminPanel;
