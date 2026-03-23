import { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Settlement from './pages/Settlement';
import Fees from './pages/Fees';
import Reconciliation from './pages/Reconciliation';
import ControlReports from './pages/ControlReports';
import CurrencyRates from './pages/CurrencyRates';
import UploadHistory from './pages/UploadHistory';
import { getPackages } from './utils/api';

function App() {
  const [currentPackageDate, setCurrentPackageDate] = useState(null);

  useEffect(() => {
    const loadPackageInfo = async () => {
      try {
        const packages = await getPackages();
        if (packages && packages.length > 0) {
          setCurrentPackageDate(packages[0].date || new Date().toLocaleDateString());
        }
      } catch (error) {
        console.error('Failed to load package info:', error);
        setCurrentPackageDate(new Date().toLocaleDateString());
      }
    };

    loadPackageInfo();
  }, []);

  return (
    <Layout currentPackageDate={currentPackageDate}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/settlement" element={<Settlement />} />
        <Route path="/fees" element={<Fees />} />
        <Route path="/reconciliation" element={<Reconciliation />} />
        <Route path="/control-reports" element={<ControlReports />} />
        <Route path="/currency-rates" element={<CurrencyRates />} />
        <Route path="/upload-history" element={<UploadHistory />} />
      </Routes>
    </Layout>
  );
}

export default App;
