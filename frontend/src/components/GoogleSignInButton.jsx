/**
 * Google sign-in button — only rendered when VITE_GOOGLE_CLIENT_ID is set.
 * Must be used inside GoogleOAuthProvider (which is only mounted when clientId exists).
 */
import { useGoogleLogin } from '@react-oauth/google';

export default function GoogleSignInButton({ onSuccess, onError, disabled, label = 'Sign in with Google' }) {
    const googleLogin = useGoogleLogin({
        flow: 'implicit',
        onSuccess,
        onError,
    });
    return (
        <button
            type="button"
            className="btn btn-outline btn-full"
            onClick={() => googleLogin()}
            disabled={disabled}
        >
            {label}
        </button>
    );
}
