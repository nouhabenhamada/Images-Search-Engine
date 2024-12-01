import React, { useState } from 'react';
import { AppBar, Toolbar, Typography, Container, Box, Button, TextField, CircularProgress, IconButton } from '@mui/material';
import { Link } from 'react-scroll';
import { Close } from '@mui/icons-material';
import axios from 'axios';

const API_URL = 'http://localhost:5000';

function App() {
  const [searchType, setSearchType] = useState('keyword');
  const [keyword, setKeyword] = useState('');
  const [image, setImage] = useState(null);
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const handleSearch = async () => {
    try {
      setError(null);
      setLoading(true);
      setResults([]);
      setShowResults(true);

      if (searchType === 'keyword') {
        const response = await axios.get(`${API_URL}/api/search/keyword/${keyword}`);
        setResults(response.data);
      } else {
        if (!image) {
          setError('Please select an image');
          return;
        }
        const formData = new FormData();
        formData.append('image', image);
        const response = await axios.post(`${API_URL}/api/search/image`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setResults(response.data);
      }
    } catch (error) {
      setError(error.response?.data?.error || error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#f0f0f0' }}>
      {/* Navbar */}
      <AppBar position="static" sx={{ backgroundColor: 'black' }}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 'bold', color: 'white' }}>
            CBIR Project
          </Typography>
          <Button color="inherit">
            <Link to="about" smooth={true} duration={500}>
              About
            </Link>
          </Button>
          <Button color="inherit">
            <Link to="contact" smooth={true} duration={500}>
              Contact
            </Link>
          </Button>
        </Toolbar>
      </AppBar>

      {/* Main Section with Background Image */}
      <Box
        sx={{
          backgroundImage: `url(/background3.jpg)`, // Image placed in the public folder
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          minHeight: '100vh', // Cover the entire area until the "About" section
          padding: '50px 0',
        }}
      >
        {/* Title Below Navbar */}
        <Container maxWidth="md" sx={{ textAlign: 'center', mt: 2, mb: 4 }}>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 'bold',
              color: 'white',
              fontFamily: 'Abril Fatface, sans-serif', // Apply Abril Fatface font
            }}
          >
            Search Engine by Keywords and Images
          </Typography>
        </Container>

        {/* Search Form Section */}
        <Container maxWidth="md">
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(0, 0, 0, 0.5)', // Optional: Adds some overlay for readability
              padding: '20px',
              borderRadius: '8px',
            }}
          >
            {/* Search Type Selection */}
            <Box sx={{ mb: 4, display: 'flex', gap: 2 }}>
              <Button
                variant={searchType === 'keyword' ? 'contained' : 'outlined'}
                onClick={() => setSearchType('keyword')}
                sx={{
                  backgroundColor: searchType === 'keyword' ? '#b0b0b0' : 'transparent',
                  color: searchType === 'keyword' ? 'black' : '#b0b0b0',
                  '&:hover': { backgroundColor: '#a0a0a0' },
                }}
              >
                Search by keyword
              </Button>
              <Button
                variant={searchType === 'image' ? 'contained' : 'outlined'}
                onClick={() => setSearchType('image')}
                sx={{
                  backgroundColor: searchType === 'image' ? '#b0b0b0' : 'transparent',
                  color: searchType === 'image' ? 'black' : '#b0b0b0',
                  '&:hover': { backgroundColor: '#a0a0a0' },
                }}
              >
                Search by image
              </Button>
            </Box>

            {/* Search Input */}
            {searchType === 'keyword' ? (
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <TextField
                  fullWidth
                  label="Enter a keyword"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  sx={{
                    backgroundColor: '#f0f0f0',
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': { borderColor: '#b0b0b0' },
                      '&:hover fieldset': { borderColor: '#a0a0a0' },
                      '&.Mui-focused fieldset': { borderColor: '#a0a0a0' },
                    },
                  }}
                />
              </Box>
            ) : (
              <Box sx={{ mb: 2 }}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImage(e.target.files[0])}
                />
              </Box>
            )}

            <Button
              variant="contained"
              onClick={handleSearch}
              sx={{
                mb: 2,
                backgroundColor: '#b0b0b0',
                color: 'black',
                '&:hover': { backgroundColor: '#a0a0a0' },
              }}
            >
              Search
            </Button>

            {loading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                <CircularProgress />
              </Box>
            )}

            {error && (
              <Box sx={{ color: 'error.main', mb: 2 }}>
                {error}
              </Box>
            )}
          </Box>

          {/* Search Results */}
          {showResults && (
            <Box sx={{ mt: 4, position: 'relative' }}>
              {/* Close Button */}
              <IconButton
                sx={{ position: 'absolute', right: 0, top: 0 }}
                onClick={() => setShowResults(false)}
              >
                <Close />
              </IconButton>

              {/* Results Grid */}
              <Box
                sx={{
                  mt: 4,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: 2,
                }}
              >
                {results.map((result, index) => (
                  <Box
                    key={index}
                    sx={{
                      border: '1px solid #ccc',
                      borderRadius: '8px',
                      padding: '8px',
                      textAlign: 'center',
                      backgroundColor: '#f9f9f9',
                    }}
                  >
                    <img
                      src={`${API_URL}/images/${result._source.image_name}`}
                      alt={result._source.image_name}
                      style={{
                        width: '100%',
                        height: '200px',
                        objectFit: 'cover',
                        borderRadius: '8px',
                      }}
                    />
                  </Box>
                ))}
              </Box>
            </Box>
          )}
        </Container>
      </Box>

      {/* About Section */}
      <Container id="about" sx={{ mt: 10 }}>
        <Typography variant="h4" sx={{ textAlign: 'center' }} gutterBottom>
          About
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {/* Texte à gauche */}
          <Typography sx={{ flex: 1, mr: 4 }}>
            This project is a Content-Based Image Retrieval (CBIR) system that allows users to search for images based on keywords or by uploading an image. CBIR systems are widely used in various domains such as e-commerce, digital libraries, and medical image retrieval, where visual similarity is key to finding relevant content.
            <br />
            Users can enter a specific keyword to search for images that match the given description, or they can upload an image to find visually similar images. The system processes the input data, compares it against a vast image database, and returns results based on either textual or visual similarity.
            <br />
            The project uses advanced image processing and machine learning techniques to index, search, and retrieve images effectively. By leveraging modern algorithms, the system provides accurate results and a seamless user experience, ensuring fast and relevant image searches.
          </Typography>

          {/* Image à droite */}
          <Box sx={{ flexShrink: 0 }}>
            <img
              src="/search.png"  // L'image se trouve dans le dossier public
              alt="Search"
              style={{
                width: '100%',
                maxWidth: '400px',
                height: 'auto',
                borderRadius: '8px',
              }}
            />
          </Box>
        </Box>
      </Container>

      {/* Contact Section */}
      <Container id="contact" sx={{ mt: 10, mb: 10, textAlign: 'center' }}>
        <Typography variant="h4" gutterBottom>
          Contact
        </Typography>
        <Typography variant="body1" gutterBottom>
          If you have any questions or feedback, feel free to reach out to us at:
       </Typography>
       <Typography variant="body1" color="primary">
         nour.laabidi@supcom.tn &nbsp; &amp; &nbsp; nouha.benhamada@supcom.tn
       </Typography>
      </Container>


      {/* Footer */}
      <Box sx={{ backgroundColor: '#333', color: 'white', padding: '20px', textAlign: 'center' }}>
        <Typography variant="body2">
          &copy; 2024 Higher School of Communications of Tunis. All rights reserved.
        </Typography>
      </Box>
    </div>
  );
}

export default App;


