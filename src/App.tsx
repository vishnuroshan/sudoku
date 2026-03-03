import { Routes, Route } from "react-router-dom";
import { GameProvider } from "./context/GameContext";
import { LandingPage } from "./components/LandingPage";
import { GamePage } from "./components/GamePage";

function App() {
  return (
    <GameProvider>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/game" element={<GamePage />} />
      </Routes>
    </GameProvider>
  );
}

export default App;
