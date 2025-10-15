export const emailTemplate = (magicLinkUrl: string) => {
  return `
    <!DOCTYPE html>
    <html lang="uk">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                background-color: #f5f5f5;
                margin: 0;
                padding: 20px;
            }
            .container {
                max-width: 600px;
                margin: 0 auto;
                background-color: #ffffff;
                border-radius: 8px;
                overflow: hidden;
            }
            .header {
                background-color: #ffffff;
                padding: 30px 20px;
                text-align: center;
                border-bottom: 1px solid #e5e5e5;
            }
            .logo {
                font-size: 28px;
                font-weight: bold;
            }
            .logo .ai {
                color: #16a34a;
            }
            .content {
                padding: 40px 30px;
            }
            .greeting {
                font-size: 24px;
                font-weight: 600;
                margin: 0 0 20px 0;
                color:#080B08;
            }
            .description {
                font-size: 14px;
                color: #666666;
                line-height: 1.6;
                margin: 0 0 30px 0;
            }
            .button {
                display: inline-block;
                width: 100%;
                padding: 14px 20px;
                background-color: #16a34a;
                color: #ffffff;
                text-decoration: none;
                border-radius: 24px;
                font-size: 16px;
                font-weight: 500;
                text-align: center;
                box-sizing: border-box;
                margin: 30px 0;
            }
            .link-section {
                margin: 30px 0;
                padding: 20px;
                background-color: #f9f9f9;
                border-radius: 8px;
            }
            .link-box {
                word-break: break-all;
                font-size: 12px;
                color: #0066cc;
                padding: 12px;
            }
            .security-section {
                background-color: #fffbf0;
                border-left: 4px solid #f59e0b;
                padding: 16px;
                margin: 30px 0;
            }
            .copyright {
                text-align: center;
                padding: 20px;
                font-size: 12px;
                color: #080B08;
                border-top: 1px solid #e5e5e5;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">
                <img
                    src="https://res.cloudinary.com/dqbv0zovj/image/upload/v1760468594/logo_rm2vto.png"
                    alt="PlasmAI"
                    width="120"
                    style="display:block; margin:0 auto;"
                />
                </div>
            </div>
            <div class="content">
                <h1 class="greeting">Your login link for PlasmAI</h1>
                <p class="description">Hi there!<br>You are receiving this email because a login to PlasmAI was requested for your email address. Click the button below to access the platform:</p>
                <a style="color:#fff" href="${magicLinkUrl}" class="button">Enter PlasmAI</a>
                <div class="link-section">
                    <div style="font-size: 13px; margin-bottom: 12px;color:#525252">Or copy this link into your browser:</div>
                    <div class="link-box"><a style="color:#525252" href="${magicLinkUrl}">${magicLinkUrl}</a></div>
                </div>
                <div class="security-section">
                    <div style="font-size: 13px; font-weight: 600; margin-bottom: 8px;">Security:</div>
                    <div style="font-size: 13px; color: #666666;">If you didn't request this link, you can safely ignore this email. This link is valid for the next 24 hours and can only be used once.</div>
                </div>
                <div style="margin-top: 20px; font-size: 13px; color:#080B08">
                    <div>Best regards,</div>
                    <div style="margin-top: 10px;">The PlasmAI Team</div>
                </div>
            </div>
            <div class="copyright">© 2025 PlasmAI. All rights reserved.</div>
        </div>
    </body>
    </html>
  `;
};
