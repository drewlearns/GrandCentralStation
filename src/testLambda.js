exports.handler = async (event) => {
  let responseMessage = 'Hello World ' + new Date().toISOString();

  const response = {
      statusCode: 200,
      headers: {
          "Content-Type": "text/plain"
      },
      body: responseMessage
  };

  return response;
};
