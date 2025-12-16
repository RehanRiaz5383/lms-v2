<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $title ?? 'LMS Notification' }}</title>
    <style>
        /* Reset styles */
        body, table, td, p, a, li, blockquote {
            -webkit-text-size-adjust: 100%;
            -ms-text-size-adjust: 100%;
        }
        table, td {
            mso-table-lspace: 0pt;
            mso-table-rspace: 0pt;
        }
        img {
            -ms-interpolation-mode: bicubic;
            border: 0;
            outline: none;
            text-decoration: none;
        }
        
        /* Main styles */
        body {
            margin: 0;
            padding: 0;
            width: 100% !important;
            height: 100% !important;
            background-color: #f4f4f4;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        }
        
        .email-wrapper {
            width: 100%;
            background-color: #f4f4f4;
            padding: 20px 0;
        }
        
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .email-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 40px 20px;
            text-align: center;
            position: relative;
        }
        
        .email-header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320"><path fill="rgba(255,255,255,0.1)" d="M0,96L48,112C96,128,192,160,288,160C384,160,480,128,576,122.7C672,117,768,139,864,154.7C960,171,1056,181,1152,165.3C1248,149,1344,107,1392,85.3L1440,64L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path></svg>') no-repeat bottom;
            background-size: cover;
            opacity: 0.3;
        }
        
        .email-header h1 {
            margin: 0;
            color: #ffffff;
            font-size: 28px;
            font-weight: 700;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            position: relative;
            z-index: 1;
        }
        
        .email-body {
            padding: 30px 20px;
            color: #333333;
            line-height: 1.6;
        }
        
        .email-body h2 {
            color: #667eea;
            font-size: 20px;
            margin-top: 0;
            margin-bottom: 15px;
        }
        
        .email-body p {
            margin: 0 0 15px 0;
            font-size: 16px;
            color: #555555;
        }
        
        .highlight-box {
            background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
            border-left: 4px solid #667eea;
            padding: 20px;
            margin: 25px 0;
            border-radius: 6px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }
        
        .highlight-box strong {
            color: #667eea;
            display: block;
            margin-bottom: 12px;
            font-size: 18px;
        }
        
        .info-item {
            padding: 8px 0;
            border-bottom: 1px solid #e9ecef;
        }
        
        .info-item:last-child {
            border-bottom: none;
        }
        
        .info-item strong {
            color: #495057;
            font-weight: 600;
        }
        
        .button {
            display: inline-block;
            padding: 14px 35px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #ffffff !important;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            margin: 25px 0;
            text-align: center;
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
            transition: all 0.3s ease;
        }
        
        .button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(102, 126, 234, 0.5);
        }
        
        .button-secondary {
            background: linear-gradient(135deg, #6c757d 0%, #495057 100%);
            box-shadow: 0 4px 12px rgba(108, 117, 125, 0.4);
        }
        
        .button-success {
            background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
            box-shadow: 0 4px 12px rgba(40, 167, 69, 0.4);
        }
        
        .button-danger {
            background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
            box-shadow: 0 4px 12px rgba(220, 53, 69, 0.4);
        }
        
        .email-footer {
            background-color: #f8f9fa;
            padding: 20px;
            text-align: center;
            border-top: 1px solid #e9ecef;
        }
        
        .email-footer p {
            margin: 5px 0;
            font-size: 12px;
            color: #6c757d;
        }
        
        .email-footer a {
            color: #667eea;
            text-decoration: none;
        }
        
        .divider {
            height: 1px;
            background-color: #e9ecef;
            margin: 20px 0;
        }
        
        @media only screen and (max-width: 600px) {
            .email-container {
                width: 100% !important;
                margin: 0 !important;
                border-radius: 0 !important;
            }
            .email-body {
                padding: 20px 15px !important;
            }
            .email-header {
                padding: 20px 15px !important;
            }
        }
    </style>
</head>
<body>
    <div class="email-wrapper">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
                <td align="center" style="padding: 20px 0;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" class="email-container">
                        <!-- Header -->
                        <tr>
                            <td class="email-header">
                                <h1>{{ $headerTitle ?? 'LMS System' }}</h1>
                            </td>
                        </tr>
                        
                        <!-- Body -->
                        <tr>
                            <td class="email-body">
                                @yield('content')
                            </td>
                        </tr>
                        
                        <!-- Footer -->
                        <tr>
                            <td class="email-footer">
                                <p style="margin-bottom: 10px;"><strong style="color: #667eea; font-size: 16px;">Tech Inn Solutions</strong></p>
                                <p style="margin: 5px 0;">📧 Email: <a href="mailto:info@techinnsolutions.net">info@techinnsolutions.net</a></p>
                                <p style="margin: 5px 0;">📱 Mobile: +923001234567</p>
                                <div class="divider"></div>
                                <p style="font-size: 11px; color: #adb5bd; margin-top: 15px;">
                                    This is an automated email. Please do not reply to this message.
                                </p>
                                <p style="font-size: 10px; color: #adb5bd; margin-top: 5px;">
                                    © {{ date('Y') }} Tech Inn Solutions. All rights reserved.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </div>
</body>
</html>

