"use client";

import { useState, useEffect, useCallback } from "react";

// Storage keys
const STORAGE_KEY_DISMISSED = "bagresponse-install-prompt-dismissed";
const STORAGE_KEY_HIDE_BANNER = "bagresponse-install-banner-hidden";

// Platform types
type Platform = "ios" | "android" | "other";

type BeforeInstallPromptEvent = Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function InstallPrompt() {
    const [isVisible, setIsVisible] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [platform, setPlatform] = useState<Platform>("other");
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isInstalled, setIsInstalled] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // Detect platform
    const detectPlatform = useCallback((): Platform => {
        const userAgent = window.navigator.userAgent.toLowerCase();
        const isIOS = /iphone|ipad|ipod/.test(userAgent);
        const isAndroid = /android/.test(userAgent);

        if (isIOS) return "ios";
        if (isAndroid) return "android";
        return "other";
    }, []);

    // Check if mobile
    const checkMobile = useCallback(() => {
        const userAgent = window.navigator.userAgent.toLowerCase();
        return /iphone|ipad|ipod|android/.test(userAgent);
    }, []);

    // Check if app is already installed or banner was hidden
    const checkInstalled = useCallback(() => {
        // Check if running in standalone mode (installed PWA)
        const isStandalone = window.matchMedia("(display-mode: standalone)").matches ||
            (window.navigator as typeof window.navigator & { standalone?: boolean }).standalone === true;

        // Check if banner was permanently hidden
        const hideBanner = localStorage.getItem(STORAGE_KEY_HIDE_BANNER);
        const wasHidden = hideBanner ? JSON.parse(hideBanner) : false;

        return isStandalone || wasHidden;
    }, []);

    useEffect(() => {
        // Only run on client
        if (typeof window === "undefined") return;

        const platform = detectPlatform();
        setPlatform(platform);
        setIsMobile(checkMobile());

        // Check if already installed or banner hidden
        if (checkInstalled()) {
            setIsInstalled(true);
            return;
        }

        // Only show on mobile devices (iOS or Android)
        if (platform === "other") return;

        // Listen for beforeinstallprompt (Android Chrome)
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
        };

        // Listen for appinstalled event
        const handleAppInstalled = () => {
            setIsInstalled(true);
            setIsVisible(false);
            setShowModal(false);
            setDeferredPrompt(null);
        };

        window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        window.addEventListener("appinstalled", handleAppInstalled);

        // Show banner after a short delay
        const timer = setTimeout(() => {
            setIsVisible(true);
        }, 2000);

        return () => {
            clearTimeout(timer);
            window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
            window.removeEventListener("appinstalled", handleAppInstalled);
        };
    }, [detectPlatform, checkMobile, checkInstalled]);

    // Handle Android install
    const handleInstallClick = async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === "accepted") {
            setIsInstalled(true);
        }

        setDeferredPrompt(null);
        setShowModal(false);
    };

    // Handle dismiss (not now)
    const handleDismiss = () => {
        setShowModal(false);
    };

    // Handle hide banner permanently
    const handleHideBanner = () => {
        localStorage.setItem(STORAGE_KEY_HIDE_BANNER, JSON.stringify(true));
        setIsVisible(false);
        setShowModal(false);
    };

    // Open modal when banner is clicked
    const handleBannerClick = () => {
        setShowModal(true);
    };

    // Don't render if not visible or already installed
    if (!isVisible || isInstalled) return null;

    return (
        <>
            {/* Sticky Banner at Top */}
            <div
                className="fixed top-0 left-0 right-0 z-50 bg-concrete border-b-2 border-ring-gold shadow-lg md:hidden"
            >
                <div className="flex items-center justify-between px-4 py-3">
                    <button
                        onClick={handleBannerClick}
                        className="flex items-center gap-3 flex-1"
                    >
                        <div className="w-8 h-8 bg-ring-gold/20 rounded-full flex items-center justify-center shrink-0">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="w-4 h-4 text-ring-gold"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                                />
                            </svg>
                        </div>
                        <div className="text-left">
                            <p
                                className="text-canvas text-sm font-medium"
                                style={{ fontFamily: "var(--font-bebas)", letterSpacing: "0.05em" }}
                            >
                                ADD TO HOME SCREEN
                            </p>
                            <p
                                className="text-rope-gray text-xs"
                                style={{ fontFamily: "var(--font-oswald)" }}
                            >
                                Install for quick access
                            </p>
                        </div>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-5 h-5 text-ring-gold"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                    <button
                        onClick={handleHideBanner}
                        className="ml-3 p-1 text-rope-gray hover:text-blood transition-colors"
                        aria-label="Don't show again"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-5 h-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Instructions Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-void/90 flex items-center justify-center p-4 z-[60]">
                    <div className="bg-concrete rounded-lg p-6 max-w-sm w-full border border-ring-gold shadow-2xl">
                        {/* Header */}
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 mx-auto mb-4 bg-ring-gold/20 rounded-full flex items-center justify-center">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="w-8 h-8 text-ring-gold"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                                    />
                                </svg>
                            </div>
                            <h2
                                className="text-2xl text-canvas mb-2"
                                style={{ fontFamily: "var(--font-bebas)" }}
                            >
                                Add to Home Screen
                            </h2>
                            <p
                                className="text-rope-gray text-sm"
                                style={{ fontFamily: "var(--font-oswald)" }}
                            >
                                Get quick access to your training timer
                            </p>
                        </div>

                        {/* Platform-specific instructions */}
                        {platform === "ios" && (
                            <div className="space-y-4 mb-6">
                                <div
                                    className="flex items-start gap-3 text-canvas"
                                    style={{ fontFamily: "var(--font-oswald)" }}
                                >
                                    <span className="w-6 h-6 bg-blood rounded-full flex items-center justify-center text-sm font-bold shrink-0">
                                        1
                                    </span>
                                    <span className="text-sm">
                                        Tap the <strong>Share</strong>{" "}
                                        <svg
                                            className="w-4 h-4 inline-block text-blood"
                                            fill="currentColor"
                                            viewBox="0 0 20 20"
                                        >
                                            <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
                                        </svg>{" "}
                                        in Safari's toolbar
                                    </span>
                                </div>
                                <div
                                    className="flex items-start gap-3 text-canvas"
                                    style={{ fontFamily: "var(--font-oswald)" }}
                                >
                                    <span className="w-6 h-6 bg-blood rounded-full flex items-center justify-center text-sm font-bold shrink-0">
                                        2
                                    </span>
                                    <span className="text-sm">
                                        Scroll and tap <strong>Add to Home Screen</strong>{" "}
                                        <svg
                                            className="w-4 h-4 inline-block text-ring-gold"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M12 4v16m8-8H4"
                                            />
                                        </svg>
                                    </span>
                                </div>
                                <div
                                    className="flex items-start gap-3 text-canvas"
                                    style={{ fontFamily: "var(--font-oswald)" }}
                                >
                                    <span className="w-6 h-6 bg-blood rounded-full flex items-center justify-center text-sm font-bold shrink-0">
                                        3
                                    </span>
                                    <span className="text-sm">
                                        Tap <strong>Add</strong> to install BAGRESPONSE
                                    </span>
                                </div>
                            </div>
                        )}

                        {platform === "android" && (
                            <div className="space-y-4 mb-6">
                                {deferredPrompt ? (
                                    <p
                                        className="text-canvas text-center"
                                        style={{ fontFamily: "var(--font-oswald)" }}
                                    >
                                        Install BAGRESPONSE for quick access to your training timer,
                                        even offline.
                                    </p>
                                ) : (
                                    <>
                                        <div
                                            className="flex items-start gap-3 text-canvas"
                                            style={{ fontFamily: "var(--font-oswald)" }}
                                        >
                                            <span className="w-6 h-6 bg-blood rounded-full flex items-center justify-center text-sm font-bold shrink-0">
                                                1
                                            </span>
                                            <span className="text-sm">
                                                Tap the <strong>menu</strong>{" "}
                                                <svg
                                                    className="w-4 h-4 inline-block text-blood"
                                                    fill="currentColor"
                                                    viewBox="0 0 20 20"
                                                >
                                                    <path d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" />
                                                </svg>{" "}
                                                in Chrome
                                            </span>
                                        </div>
                                        <div
                                            className="flex items-start gap-3 text-canvas"
                                            style={{ fontFamily: "var(--font-oswald)" }}
                                        >
                                            <span className="w-6 h-6 bg-blood rounded-full flex items-center justify-center text-sm font-bold shrink-0">
                                                2
                                            </span>
                                            <span className="text-sm">
                                                Tap <strong>Add to Home screen</strong> or{" "}
                                                <strong>Install app</strong>
                                            </span>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex flex-col gap-3">
                            {platform === "android" && deferredPrompt && (
                                <button
                                    onClick={handleInstallClick}
                                    className="w-full px-4 py-3 bg-blood text-canvas rounded hover:bg-glove-red transition-colors"
                                    style={{ fontFamily: "var(--font-bebas)", fontSize: "1.25rem" }}
                                >
                                    INSTALL NOW
                                </button>
                            )}
                            <div className="flex gap-3">
                                <button
                                    onClick={handleDismiss}
                                    className="flex-1 px-4 py-3 border border-rope-gray text-rope-gray rounded hover:border-blood hover:text-blood transition-colors"
                                    style={{ fontFamily: "var(--font-oswald)" }}
                                >
                                    NOT NOW
                                </button>
                                <button
                                    onClick={handleHideBanner}
                                    className="flex-1 px-4 py-3 border border-blood/50 text-blood/70 rounded hover:border-blood hover:text-blood transition-colors"
                                    style={{ fontFamily: "var(--font-oswald)" }}
                                >
                                    DON'T SHOW AGAIN
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
