<?php

$term=$_GET['person'];

$term = str_replace(',', '', $term);
$idx = strpos($term, ' ');
if ($idx > 0) {
	$term=substr($term, 0, $idx);

}
$text = file_get_contents('mactut.txt');
if (preg_match_all("/.*$term.*/i",$text, $matches )) { 
	foreach ($matches[0] as  $hit) {
  
		print $hit . '<br />'; 
	}
} else { 
    print "No match found."; 
}

 
?>