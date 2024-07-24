const validateImages = (req, res, next) => {
    if (!req.files || !req.files['image']) {
        return res.status(400).send('No image uploaded.');
    }

    const imageFiles = req.files['image'];

    // Check allowed MIME types
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']; // Add more allowed types as needed

    for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];

        // Check if MIME type is allowed
        if (!allowedTypes.includes(file.mimetype)) {
            return res.status(400).send(`Unsupported file type: ${file.originalname}`);
        }
    }

    next();
};
module.exports= {
    validateImages
}