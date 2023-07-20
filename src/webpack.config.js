module.exports = {
    module: {
      rules: [
        {
          test: /\.css$/,
          use: [
            {
              loader: 'raw-loader',
            },
          ],
        },
      ],
    },
  };
  
  