interface PasswordResetEmailProps {
  userName: string;
  resetToken: string;
}

export default function PasswordResetEmail({
  userName,
  resetToken,
}: PasswordResetEmailProps) {
  return (
    <div
      style={{
        fontFamily: "Segoe UI, Tahoma, Geneva, Verdana, sans-serif",
        maxWidth: "600px",
        margin: "0 auto",
      }}
    >
      {/* Header with emerald background */}
      <div
        style={{
          background: "linear-gradient(135deg, #059669 0%, #10b981 100%)",
          padding: "40px 20px",
          borderRadius: "8px 8px 0 0",
          textAlign: "center" as const,
        }}
      >
        <h1
          style={{
            color: "#fff",
            margin: "0",
            fontSize: "28px",
            fontWeight: "bold",
          }}
        >
          Password Reset
        </h1>
        <p style={{ color: "#d1fae5", margin: "8px 0 0 0", fontSize: "14px" }}>
          Secure Your Account
        </p>
      </div>

      {/* Main content */}
      <div
        style={{
          padding: "40px 30px",
          backgroundColor: "#f0fdf4",
        }}
      >
        <p style={{ color: "#065f46", fontSize: "16px", margin: "0 0 24px 0" }}>
          Hi <strong>{userName}</strong>,
        </p>

        <p
          style={{
            color: "#047857",
            fontSize: "15px",
            lineHeight: "1.6",
            margin: "0 0 24px 0",
          }}
        >
          We received a request to reset your password. If you didn't make this
          request, you can safely ignore this email.
        </p>

        {/* Token Box */}
        <div
          style={{
            backgroundColor: "#fff",
            border: "2px solid #10b981",
            borderRadius: "8px",
            padding: "24px",
            margin: "24px 0",
            textAlign: "center" as const,
          }}
        >
          <p
            style={{
              color: "#059669",
              fontSize: "12px",
              fontWeight: "bold",
              margin: "0 0 12px 0",
              textTransform: "uppercase",
            }}
          >
            Your Verification Code
          </p>
          <p
            style={{
              color: "#059669",
              fontSize: "32px",
              fontWeight: "bold",
              margin: "0",
              letterSpacing: "2px",
              fontFamily: "Courier New, monospace",
              wordBreak: "break-all" as const,
            }}
          >
            {resetToken}
          </p>
          <p
            style={{ color: "#6b7280", fontSize: "12px", margin: "12px 0 0 0" }}
          >
            This code expires in 15 minutes
          </p>
        </div>

        {/* Instructions */}
        <div
          style={{
            backgroundColor: "#ecfdf5",
            borderLeft: "4px solid #10b981",
            padding: "16px",
            borderRadius: "4px",
            margin: "24px 0",
          }}
        >
          <p
            style={{
              color: "#047857",
              fontSize: "14px",
              margin: "0",
              lineHeight: "1.5",
            }}
          >
            1. Copy the verification code above
            <br />
            2. Go back to the password reset page
            <br />
            3. Paste the code and enter your new password
            <br />
            4. Click confirm to reset your password
          </p>
        </div>

        {/* Security notice */}
        <div
          style={{
            backgroundColor: "#fef2f2",
            borderLeft: "4px solid #ef4444",
            padding: "16px",
            borderRadius: "4px",
            margin: "24px 0",
          }}
        >
          <p
            style={{
              color: "#7f1d1d",
              fontSize: "13px",
              margin: "0",
              lineHeight: "1.5",
            }}
          >
            <strong>Security Tip:</strong> Never share this code with anyone.
            Our support team will never ask for this code.
          </p>
        </div>

        <p
          style={{
            color: "#6b7280",
            fontSize: "14px",
            margin: "32px 0 0 0",
            lineHeight: "1.6",
          }}
        >
          Best regards,
          <br />
          <span style={{ color: "#059669", fontWeight: "bold" }}>
            Nsoatre Government Hospital.
          </span>
        </p>
      </div>

      {/* Footer */}
      <div
        style={{
          padding: "20px 30px",
          backgroundColor: "#ecfdf5",
          borderRadius: "0 0 8px 8px",
          borderTop: "1px solid #d1fae5",
          textAlign: "center" as const,
        }}
      >
        <p style={{ color: "#059669", fontSize: "12px", margin: "0" }}>
          © 2025 Nsoatre Government Hospital. All rights reserved.
        </p>
        <p style={{ color: "#10b981", fontSize: "11px", margin: "8px 0 0 0" }}>
          This is an automated message, please do not reply directly to this
          email.
        </p>
      </div>
    </div>
  );
}
