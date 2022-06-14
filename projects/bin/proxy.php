<?php
if (isValidRequest()) {
   echo file_get_contents($_GET['url']);
}

function isValidRequest() {
    return $_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['key']) && 
    $_GET['key'] === 'somekey';
};
?>