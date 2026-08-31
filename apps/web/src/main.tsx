import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { WalletProvider } from "./lib/wallet";
import { AppRoutes } from "./App";
import "./index.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 4000, retry: 1 } } });

ReactDOM.createRoot(document.getElementById("root")!).render(<React.StrictMode><QueryClientProvider client={queryClient}><WalletProvider><BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><AppRoutes /></BrowserRouter></WalletProvider></QueryClientProvider></React.StrictMode>);
