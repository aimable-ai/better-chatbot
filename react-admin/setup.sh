#!/bin/bash

echo "🚀 Setting up React Admin Demo App"
echo "=================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the react-admin directory"
    exit 1
fi

echo "📦 Installing dependencies..."
npm install

echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Make sure the main Better Chatbot app is running on http://localhost:3000"
echo "2. Run: npm run dev"
echo "3. Open http://localhost:3001 in your browser"
echo ""
echo "🔐 Login with the same credentials you use for the main app"
echo "🎉 Test the shared authentication between both apps!"



