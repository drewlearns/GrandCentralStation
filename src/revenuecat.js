const axios = require('axios');

exports.handler = async (event) => {
  const REVENUECAT_API_KEY = process.env.REVENUECAT_API_KEY;
  let uuid;

  try {
    const body = JSON.parse(event.body);
    uuid = body.uuid;
  } catch (error) {
    console.error('Error parsing JSON body:', error);
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: 'Invalid JSON format',
      }),
    };
  }

  if (!uuid) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: 'UUID is required',
      }),
    };
  }

  const url = `https://api.revenuecat.com/v1/subscribers/${uuid}`;
  const headers = {
    'Authorization': `Bearer ${REVENUECAT_API_KEY}`,
    'Content-Type': 'application/json'
  };

  try {
    const response = await axios.get(url, { headers });
    console.log(uuid)
    console.log(response.status)
    if (response.status === 200 || response.status === 201 ) {
      console.log('User retrieved or created successfully:', response.data);
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: 'User retrieved or created successfully',
          data: response.data
        }),
      };
    } else {
      console.error('Failed to create user:', response.data);
      return {
        statusCode: response.status,
        body: JSON.stringify({
          message: 'Failed to create user',
          error: response.data
        }),
      };
    }
  } catch (error) {
    console.error('Error retrieving or creating user:', error.response ? error.response.data : error.message);

    return {
      statusCode: error.response ? error.response.status : 500,
      body: JSON.stringify({
        message: 'Error retrieving or creating user',
        error: error.response ? error.response.data : error.message
      }),
    };
  }
};
