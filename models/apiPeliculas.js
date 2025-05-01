const axios = require('axios');

const traerPeliculas = async () => {
  try {
    const respuesta = await axios.get('https://api.themoviedb.org/3/movie/popular', {
      headers: {
        Authorization: `Bearer ${process.env.MOVIES_TOKEN}`, // Usamos variable .env
      },
    });

    return respuesta.data.results; // Array de películas
  } catch (error) {
    console.error('Error al traer películas:', error);
    return [];
  }
};

module.exports = traerPeliculas;
