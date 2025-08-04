# 📚 Manga Database

A modern, local manga management application built with TypeScript, Vite, DuckDB, and AWS S3. Features a clean architecture and modern UI for organizing your manga collection.

## ✨ Features

- **Local Database**: Uses DuckDB for fast, local data storage
- **Cloud Storage**: AWS S3 integration for manga file storage
- **Modern UI**: Clean, responsive interface built with vanilla TypeScript
- **File Support**: Supports images, PDF, CBZ, and CBR files
- **Search & Filter**: Find manga by title, author, or genre
- **Chapter Management**: Upload and organize manga chapters
- **Real-time Progress**: Upload progress tracking
- **Clean Architecture**: Modular, maintainable codebase

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- AWS account (optional, for cloud storage)

### Installation

1. **Clone and setup**

   ```bash
   git clone <your-repo>
   cd mangadb
   npm install
   ```

2. **Configure environment**

   ```bash
   cp .env.example .env.local
   # Edit .env.local with your AWS credentials (optional)
   ```

3. **Start development server**

   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:5173`

## 🏗️ Project Structure

```
src/
├── components/         # UI components (future expansion)
├── config/            # Application configuration
├── services/          # Business logic and data services
│   ├── database.ts    # DuckDB database operations
│   ├── s3.ts         # AWS S3 file operations
│   └── index.ts      # Main application service
├── types/            # TypeScript type definitions
├── utils/            # Utility functions
├── main.ts          # Application entry point
└── style.css        # Application styles
```

## 🛠️ Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run type-check` - Run TypeScript type checking
- `npm run lint` - Run ESLint (when configured)

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file with:

```env
# Database
DB_PATH=./data/manga.db
DB_MAX_CONNECTIONS=10

# AWS S3 (optional)
S3_BUCKET_NAME=your-manga-bucket
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# Upload settings
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=104857600  # 100MB
```

### Supported File Types

- **Images**: .jpg, .jpeg, .png, .webp
- **Archives**: .pdf, .cbz, .cbr

## 🗃️ Database Schema

The application uses DuckDB with the following schema:

- **manga**: Main manga information
- **chapters**: Chapter data with file references
- **users**: User preferences (future feature)

## 🔄 Development Workflow

1. **Add new manga** - Upload cover and metadata
2. **Add chapters** - Upload chapter files with progress tracking
3. **Browse library** - Search and filter your collection
4. **Read manga** - View chapters (coming soon)

## 🚀 Deployment

### Build for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

### Local Production Preview

```bash
npm run preview
```

## 🧰 Architecture

### Clean Architecture Principles

- **Separation of Concerns**: Services, types, and utilities are separated
- **Dependency Injection**: Services can be easily mocked and tested
- **Type Safety**: Full TypeScript coverage
- **Modular Design**: Easy to extend and maintain

### Key Services

- **DatabaseService**: Handles all database operations
- **S3Service**: Manages file upload/download operations
- **MangaService**: Coordinates between database and storage

## 🔐 Security

- Environment variables for sensitive data
- File type validation
- File size limits
- Input sanitization

## 🚧 Future Enhancements

- [ ] Manga reader interface
- [ ] User authentication
- [ ] Reading progress tracking
- [ ] Tags and collections
- [ ] Import/export functionality
- [ ] Dark mode theme
- [ ] Mobile app

## 🐛 Troubleshooting

### Common Issues

1. **Database connection errors**

   - Check `DB_PATH` in `.env.local`
   - Ensure write permissions to data directory

2. **File upload failures**

   - Verify AWS credentials
   - Check file size limits
   - Confirm supported file types

3. **Build errors**
   - Run `npm install` to ensure dependencies
   - Check TypeScript errors with `npm run type-check`

## 📝 License

This project is licensed under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

---

Built with ❤️ using modern web technologies for manga enthusiasts.
