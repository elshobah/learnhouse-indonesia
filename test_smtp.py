#!/usr/bin/env python3
"""
Test SMTP Email Configuration
Script untuk test koneksi SMTP dan kirim email ke shobahel@gmail.com
"""

import sys
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import os

# Load environment variables dari .env secara manual
def load_env_file(filepath):
    """Load .env file manually"""
    if os.path.exists(filepath):
        with open(filepath, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    # Remove quotes if present
                    value = value.strip('"').strip("'")
                    os.environ[key.strip()] = value

# Load dari .env file
load_env_file('.env')

# SMTP Configuration dari .env
SMTP_HOST = os.getenv("LEARNHOUSE_SMTP_HOST", "srv162.niagahoster.com")
SMTP_PORT = int(os.getenv("LEARNHOUSE_SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("LEARNHOUSE_SMTP_USERNAME", "support@elshobah.com")
SMTP_PASSWORD = os.getenv("LEARNHOUSE_SMTP_PASSWORD", "")
SMTP_USE_TLS = os.getenv("LEARNHOUSE_SMTP_USE_TLS", "true").lower() == "true"
SYSTEM_EMAIL = os.getenv("LEARNHOUSE_SYSTEM_EMAIL_ADDRESS", "noreply@elshobah.com")

# Test recipient
TO_EMAIL = "shobahel@gmail.com"

def print_config():
    """Print konfigurasi SMTP (tanpa password)"""
    print("\n" + "="*60)
    print("[SMTP Configuration]")
    print("="*60)
    print(f"Host          : {SMTP_HOST}")
    print(f"Port          : {SMTP_PORT}")
    print(f"Username      : {SMTP_USERNAME}")
    print(f"Password      : {'***' + SMTP_PASSWORD[-3:] if SMTP_PASSWORD else 'NOT SET'}")
    print(f"TLS Enabled   : {SMTP_USE_TLS}")
    print(f"System Email  : {SYSTEM_EMAIL}")
    print(f"Recipient     : {TO_EMAIL}")
    print("="*60 + "\n")

def test_smtp_connection():
    """Test koneksi SMTP"""
    print("[*] Testing SMTP Connection...")
    try:
        if SMTP_USE_TLS:
            server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
            server.starttls()
            print("[+] TLS Connection established")
        else:
            server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
            print("[+] SMTP Connection established (without TLS)")

        # Test login
        if SMTP_USERNAME and SMTP_PASSWORD:
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            print("[+] Authentication successful")
        else:
            print("[!] No credentials provided, skipping authentication")

        server.quit()
        print("[+] Connection closed gracefully\n")
        return True
    except smtplib.SMTPAuthenticationError as e:
        print(f"[-] Authentication failed: {e}\n")
        return False
    except smtplib.SMTPException as e:
        print(f"[-] SMTP Error: {e}\n")
        return False
    except Exception as e:
        print(f"[-] Connection Error: {e}\n")
        return False

def send_test_email():
    """Kirim email test ke shobahel@gmail.com"""
    print("[*] Sending Test Email...")

    try:
        # Create message
        # IMPORTANT: Use SMTP_USERNAME (authenticated user) as FROM address to avoid spoofing rejection
        # SMTP servers often require FROM to match the authenticated user
        from_email = SMTP_USERNAME if SMTP_USERNAME else SYSTEM_EMAIL

        msg = MIMEMultipart("alternative")
        msg["From"] = f"LearnHouse Test <{from_email}>"
        msg["To"] = TO_EMAIL
        msg["Subject"] = "[TEST] LearnHouse SMTP Test Email"

        # Email body
        html_body = f"""
        <html>
            <head>
                <style>
                    body {{ font-family: Arial, sans-serif; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .header {{ background-color: #007bff; color: white; padding: 20px; border-radius: 5px; }}
                    .content {{ padding: 20px; background-color: #f8f9fa; border-radius: 5px; margin-top: 10px; }}
                    .footer {{ margin-top: 20px; font-size: 12px; color: #666; }}
                    .success {{ color: green; font-weight: bold; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>LearnHouse SMTP Test</h1>
                    </div>
                    <div class="content">
                        <p>Halo!</p>
                        <p>Ini adalah <span class="success">email test</span> dari sistem LearnHouse Indonesia.</p>
                        <p><strong>Status SMTP:</strong> Berfungsi dengan baik</p>
                        <hr>
                        <h3>Konfigurasi Test:</h3>
                        <ul>
                            <li><strong>SMTP Host:</strong> {SMTP_HOST}</li>
                            <li><strong>SMTP Port:</strong> {SMTP_PORT}</li>
                            <li><strong>TLS:</strong> {'Enabled' if SMTP_USE_TLS else 'Disabled'}</li>
                            <li><strong>From:</strong> {SYSTEM_EMAIL}</li>
                            <li><strong>To:</strong> {TO_EMAIL}</li>
                        </ul>
                        <hr>
                        <p>Jika kamu menerima email ini, berarti konfigurasi SMTP sudah bekerja dengan sempurna!</p>
                    </div>
                    <div class="footer">
                        <p>Email ini dikirim oleh sistem test LearnHouse.</p>
                        <p><em>Waktu test: {__import__('datetime').datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</em></p>
                    </div>
                </div>
            </body>
        </html>
        """

        msg.attach(MIMEText(html_body, "html"))

        # Connect dan send
        if SMTP_USE_TLS:
            server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
            server.starttls()
        else:
            server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)

        # Login jika ada credentials
        if SMTP_USERNAME and SMTP_PASSWORD:
            server.login(SMTP_USERNAME, SMTP_PASSWORD)

        # Send email
        server.sendmail(SYSTEM_EMAIL, TO_EMAIL, msg.as_string())
        server.quit()

        print(f"[+] Email successfully sent to {TO_EMAIL}\n")
        return True

    except smtplib.SMTPAuthenticationError as e:
        print(f"[-] Authentication failed: {e}\n")
        return False
    except smtplib.SMTPRecipientsRefused as e:
        print(f"[-] Recipient rejected: {e}\n")
        return False
    except smtplib.SMTPException as e:
        print(f"[-] SMTP Error: {e}\n")
        return False
    except Exception as e:
        print(f"[-] Error: {e}\n")
        return False

def main():
    """Main test function"""
    print("\n" + "="*60)
    print("LearnHouse Indonesia - SMTP Email Test")
    print("="*60)

    # Check if environment variables are set
    if not SMTP_PASSWORD:
        print("[!] WARNING: LEARNHOUSE_SMTP_PASSWORD not set in .env file!")
        print("[!] Please make sure your .env file has the correct SMTP password.\n")

    print_config()

    # Test connection
    if not test_smtp_connection():
        print("[-] Failed to connect to SMTP server. Please check your configuration.")
        sys.exit(1)

    # Send test email
    if not send_test_email():
        print("[-] Failed to send test email.")
        sys.exit(1)

    print("="*60)
    print("[+] All tests passed!")
    print("="*60)
    print(f"\n[*] Check your inbox at {TO_EMAIL} for the test email.")
    print("[*] If you don't see it, check your spam folder.\n")

if __name__ == "__main__":
    main()
