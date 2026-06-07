"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { Loader2 } from "lucide-react";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

type GoogleCredentialResponse = {
  credential?: string;
};

type GoogleAccountsId = {
  initialize: (config: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
  }) => void;
  renderButton: (
    parent: HTMLElement,
    options: {
      theme?: "outline" | "filled_blue" | "filled_black";
      size?: "large" | "medium" | "small";
      text?: "signin_with" | "signup_with" | "continue_with" | "signin";
      shape?: "rectangular" | "pill" | "circle" | "square";
      width?: number;
      logo_alignment?: "left" | "center";
    },
  ) => void;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: GoogleAccountsId;
      };
    };
  }
}

interface GoogleSignInButtonProps {
  mode: "login" | "register";
  disabled?: boolean;
  onCredential: (credential: string) => void | Promise<void>;
}

export function GoogleSignInButton({ mode, disabled = false, onCredential }: GoogleSignInButtonProps) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [renderError, setRenderError] = useState("");

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !scriptReady || !buttonRef.current || disabled) return;

    const google = window.google?.accounts?.id;
    if (!google) {
      setRenderError("Google sign-in failed to load.");
      return;
    }

    setRenderError("");
    buttonRef.current.innerHTML = "";

    google.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (response) => {
        if (response.credential) {
          void onCredential(response.credential);
        }
      },
      auto_select: false,
      cancel_on_tap_outside: true,
    });

    google.renderButton(buttonRef.current, {
      theme: "outline",
      size: "large",
      text: mode === "register" ? "signup_with" : "signin_with",
      shape: "rectangular",
      width: buttonRef.current.offsetWidth || 320,
      logo_alignment: "left",
    });
  }, [disabled, mode, onCredential, scriptReady]);

  if (!GOOGLE_CLIENT_ID) {
    return null;
  }

  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
        onError={() => setRenderError("Google sign-in failed to load.")}
      />
      <div className="space-y-2">
        <div
          ref={buttonRef}
          className={disabled ? "pointer-events-none opacity-60" : "flex justify-center"}
          aria-hidden={disabled}
        />
        {!scriptReady && !renderError && (
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading Google sign-in...
          </div>
        )}
        {renderError && (
          <p className="text-center text-sm text-red-600 dark:text-red-400">{renderError}</p>
        )}
      </div>
    </>
  );
}

export function isGoogleSignInConfigured() {
  return Boolean(GOOGLE_CLIENT_ID);
}
