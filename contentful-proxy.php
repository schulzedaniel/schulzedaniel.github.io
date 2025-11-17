<?php
// contentful.php

// Load secrets (you can hardcode for a test, but better use a separate config file)
$spaceId = '4fo2kk5ozptr';
$envId   = 'master';
$token   = 'G8GhkOJkRXADVHIhq1lH2IH5bk9nJDSngpyOM7ddW2Q';

$endpoint = "https://graphql.contentful.com/content/v1/spaces/$spaceId/environments/$envId";

/// For the prod system use:
/// "https://graphql.contentful.com/content/v1/spaces/$spaceId/environments/$envId"

// Read the JSON body from the frontend
$input = file_get_contents('php://input');

$ch = curl_init($endpoint);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
  "Authorization: Bearer $token",
  "Content-Type: application/json"
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, $input);

$result = curl_exec($ch);
curl_close($ch);

// Return result to browser
header('Content-Type: application/json');
echo $result;
