import express from 'express';
import path from 'path';
import {pool} from '../../app';
import {
  rollBack, isLoggedIn, processImage, getValidImageMimeTypes, getUser, Storage
} from '../../utils/Utils';
import {nls} from '../../i18n/en';

const router = express.Router();

/**
 * Upload the user's profile photo
 */
router.post('/upload_profile_photo', Storage('profile').array('files'), isLoggedIn, (req, res) => {
  const photo = req.files[0];

  // Check to see if the photo is actually a photo
  if (!getValidImageMimeTypes().includes(photo.mimetype)) {
    return res.status(400).json({
      json: {
        err: {
          message: nls.INVALID_IMAGE_TYPE
        }
      }
    });
  }

  // Add the project's working directory to the path
  const uploadDir = path.join(process.env.PWD, photo.path);

  // Resize the image so it's 500 pixels wide
  processImage({
    width: 500,
    path: uploadDir
  }, (path, err) => {
    if (err) {
      return res.status(400).json({err});
    }

    // Create the publically accessible path to the photo by removing '/assets'
    // from the path
    const photoUrl = photo.path.replace(/^(assets)/, "").replace(/\\/g, "/");

    // Connect to the pool, and grab a client
    pool.connect().then(client => {
      const {userId, token} = req.body;

      // Update the user's personal information
      client.query(`UPDATE "userTable" SET "photoUrl"=$1 WHERE "userId"=$2`, [photoUrl, userId]).then(result => {
        // Get the user. The client gets released
        getUser(client, userId, token).then(user => {
          res.status(200).json({user});
        }).catch(err => {
          res.status(500).json({err});
        });
      }).catch(err => {
        // Release the client back to the pool
        client.release();

        // Return the error
        return res.status(500).json({err});
      });
    }).catch(err => {
      res.status(500).json({err});
    });
  });
});

/**
 * Upload an item's photos to the server, but don't store in db.
 */
router.post('/upload_item_photos', Storage('items').array('files'), isLoggedIn, (req, res) => {
  const photos = req.files;

  let photoUrls = [];
  let asyncCalls = [];

  photos.forEach(function(photo) {
    //create promises for processing each photo
    asyncCalls.push(new Promise((resolve, reject) => {
      // Check to see if the photo is actually a photo
      if (!getValidImageMimeTypes().includes(photo.mimetype)) {
        let err = {
          message: nls.INVALID_IMAGE_TYPE
        }

        reject(err);
      }

      // Add the project's working directory to the path
      const uploadDir = path.join(process.env.PWD, photo.path);

      // Resize the image so it's 200 pixels wide
      processImage({
        width: 1000,
        path: uploadDir
      }, (file, err) => {
        // if there is an error, reject promise
        if (err) {
          return reject(err);
        }

        // set a publicly accessible url
        file = file.replace(/^[^_]*assets/, "").replace(/\\/g, "/");
        // add photo to the photoUrls array
        photoUrls.push(file);

        // If all went well, resolve promise
        resolve(file);
      });
    }));
  });

  Promise.all(asyncCalls).then(() => {
    const {userId, token} = req.body;

    pool.connect().then(client => {
      getUser(client, userId, token).then(user => {
        res.status(200).json({user, photoUrls});
      }).catch(err => {
        res.status(500).json({err});
      });
    }).catch(err => {
      // Release the client back to the pool
      client.release();

      // Return the error
      return res.status(500).json({err});
    });
  }).catch(err => {
    return res.status(400).json({err});
  });
});

export {router as uploadPhotos}
