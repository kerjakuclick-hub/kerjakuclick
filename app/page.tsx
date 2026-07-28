import Hero from "@/components/Hero";
import ServicesGrid from "@/components/ServicesGrid";
import HowItWorks from "@/components/HowItWorks";
import OrderForm from "@/components/OrderForm";
import Promo from "@/components/Promo";
import Footer from "@/components/Footer";

export default function HomePage() {
  return (
    <main>
      <Hero />
      <ServicesGrid />
      <HowItWorks />
      <OrderForm />
      <Promo />
      <Footer />
    </main>
  );
}
