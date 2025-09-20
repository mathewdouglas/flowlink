import "../app/globals.css";
import { AppProvider } from "../context/AppContext";

export default function App({ Component, pageProps }) {
  return (
    <AppProvider>
      <div className="antialiased">
        <Component {...pageProps} />
      </div>
    </AppProvider>
  );
}