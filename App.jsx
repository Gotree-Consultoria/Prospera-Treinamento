import { useState } from 'react'
import Header from './components/Header'
import HeroSection from './components/HeroSection'
import ProductCategories from './components/ProductCategories'
import PackagesSection from './components/PackagesSection'
import AboutSection from './components/AboutSection'
import ContactSection from './components/ContactSection'
import AccountPage from './components/AccountPage'
import Footer from './components/Footer'
import './App.css'

function App() {
  const [currentPage, setCurrentPage] = useState('home') // 'home', 'about', 'contact', 'account'

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return (
          <>
            <HeroSection />
            <ProductCategories />
            <PackagesSection />
          </>
        )
      case 'about':
        return <AboutSection />
      case 'contact':
        return <ContactSection />
      case 'account':
        return <AccountPage />
      default:
        return (
          <>
            <HeroSection />
            <ProductCategories />
            <PackagesSection />
          </>
        )
    }
  }

  return (
    <div className="min-h-screen">
      <Header cartItems={cartItems} setCurrentPage={setCurrentPage} />
      <main>
        {renderPage()}
      </main>
      <Footer />
    </div>
  )
}

export default App
